const twilio = require('twilio');
const { createCallSession, updateCallSession } = require('../state/calls');
const { getNumbersPool, recordCallOnNumber } = require('../state/ved');

/**
 * Initiates an outbound call using the configured Twilio numbers pool in fallback order.
 * If a number is busy, unverified, or encounters capacity limits, it seamlessly
 * attempts the next number in priority order.
 *
 * @param {Object} params 
 * @param {string} params.to - Recipient phone number
 * @param {string} params.entityName - Name of the agent/entity (defaults to 'VED')
 * @returns {Promise<Object>} - The Twilio call object with fallback info
 */
async function performOutboundCall({ to, entityName }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serverUrl = process.env.PUBLIC_BASE_URL || process.env.SERVER_URL;

  if (!accountSid || !authToken || !serverUrl) {
    console.error('[TwilioService] Configuration error: Missing account credentials or serverUrl');
    throw new Error('Twilio configuration incomplete on server');
  }

  const client = twilio(accountSid, authToken);
  const pool = getNumbersPool();
  
  // Build ordered list of candidate numbers
  const candidateNumbers = pool.length > 0 
    ? pool.map(p => p.number) 
    : [process.env.TWILIO_PHONE_NUMBER].filter(Boolean);

  if (candidateNumbers.length === 0) {
    throw new Error('No Twilio phone numbers configured in VED pool');
  }

  let lastError = null;
  let call = null;
  let usedNumber = null;
  let fallbackAttempts = [];

  for (let i = 0; i < candidateNumbers.length; i++) {
    const from = candidateNumbers[i];
    console.log(`[TwilioService] Attempting outbound call to ${to} using number [${i + 1}/${candidateNumbers.length}]: ${from}`);

    try {
      call = await client.calls.create({
        url: `${serverUrl}/twilio/voice`,
        to: to,
        from: from,
      });

      usedNumber = from;
      recordCallOnNumber(from);
      console.log(`[TwilioService] Call created successfully. SID: ${call.sid} via ${from}`);
      break; // Successfully placed call
    } catch (err) {
      console.warn(`[TwilioService] Number ${from} failed with error: ${err.message} (Code: ${err.code || 'N/A'})`);
      fallbackAttempts.push({ number: from, error: err.message, code: err.code });
      lastError = err;

      // Unrecoverable user destination errors (e.g., bad format for 'to') shouldn't retry all numbers
      if (err.code === 21211) {
        throw new Error(`Invalid destination phone number: ${to}`);
      }

      // If there are more numbers, continue fallback
      if (i < candidateNumbers.length - 1) {
        console.log(`[TwilioService] Seamlessly falling back to next available configured number...`);
      }
    }
  }

  if (!call) {
    console.error('[TwilioService] All configured Twilio numbers failed for destination:', to);
    if (lastError && lastError.code === 21608) {
      throw new Error(`The destination number ${to} is unverified on Twilio Trial account.`);
    }
    throw new Error(`Failed to initiate call through configured numbers: ${lastError ? lastError.message : 'Unknown error'}`);
  }

  // Initialize call session state with number metadata
  const session = createCallSession(call.sid, to, entityName || 'VED');
  updateCallSession(call.sid, {
    twilioNumber: usedNumber,
    fallbackAttempts: fallbackAttempts.length > 0 ? fallbackAttempts : undefined
  });

  return { ...call, usedNumber, fallbackAttempts };
}

module.exports = {
  performOutboundCall
};

