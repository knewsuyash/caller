const prisma = require('./db');

async function connect() {
  // Legacy compatibility: Just return true or a dummy db object 
  // since Prisma connects automatically.
  return true;
}

function getDb() {
  return null; // Legacy compatibility
}

async function closeConnection() {
  await prisma.$disconnect();
}

/**
 * Save a complete call record to the database.
 */
async function saveCall(callData) {
  try {
    const { entity_id, phone, summary, resolution_status, intent, ...restData } = callData;

    const record = await prisma.call.create({
      data: {
        entity_id: entity_id || undefined,
        phone,
        summary,
        resolution_status,
        intent,
        callData: Object.keys(restData).length > 0 ? restData : undefined
      }
    });

    // Update legacy analytics array as well
    await saveCallSummary(phone, callData);

    return record;
  } catch (err) {
    console.error('[PostgreSQL/Prisma] Error saving call:', err.message);
    return null;
  }
}

/**
 * Fetch calls for a specific entity with basic analytics.
 */
async function getEntityCalls(entityId) {
  try {
    return await prisma.call.findMany({
      where: { entity_id: entityId },
      orderBy: { createdAt: 'desc' }
    });
  } catch (err) {
    console.error('[PostgreSQL/Prisma] Error fetching entity calls:', err.message);
    return [];
  }
}

/**
 * Fetch interaction history for a specific phone number.
 */
async function getCallMemory(phoneNumber) {
  try {
    const calls = await prisma.call.findMany({
      where: { phone: phoneNumber },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (calls.length > 0) {
      return calls.map(c => ({
        text: c.summary,
        timestamp: c.createdAt,
        intent: c.intent
      }));
    }

    // Fallback to analytics
    const analytics = await prisma.analytics.findUnique({
      where: { phone_number: phoneNumber }
    });
    
    if (!analytics) return [];
    return Array.isArray(analytics.summaries) ? analytics.summaries : [];
  } catch (err) {
    console.error(`[PostgreSQL/Prisma] Error fetching memory for ${phoneNumber}:`, err.message);
    return [];
  }
}

/**
 * Add a new summary to the phone number's history (Legacy support).
 */
async function saveCallSummary(phoneNumber, summaryData) {
  try {
    const existing = await prisma.analytics.findUnique({
      where: { phone_number: phoneNumber }
    });

    let updatedSummaries = existing && Array.isArray(existing.summaries) ? existing.summaries : [];

    updatedSummaries.unshift({
      text: summaryData.summary,
      timestamp: new Date().toISOString(),
      intent: summaryData.intent || summaryData.key_intent || 'unknown',
      details: summaryData.important_details || {}
    });

    await prisma.analytics.upsert({
      where: { phone_number: phoneNumber },
      update: { summaries: updatedSummaries },
      create: { phone_number: phoneNumber, summaries: updatedSummaries }
    });
  } catch (err) {
    console.error(`[PostgreSQL/Prisma] Error saving summary for ${phoneNumber}:`, err.message);
  }
}

/**
 * Fetch all analytics data for the dashboard (Global Admin).
 */
async function getAllAnalytics() {
  try {
    return await prisma.call.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (err) {
    console.error('[PostgreSQL/Prisma] Error fetching all analytics:', err.message);
    return [];
  }
}

/**
 * Fetch all knowledge source documents/text blocks.
 */
async function getKnowledge(entity) {
  try {
    if (entity && entity !== 'unknown' && entity !== 'ALL') {
      return await prisma.knowledge.findMany({
        where: {
          OR: [
            { entity: { equals: entity, mode: 'insensitive' } },
            { entity: null },
            { entity: "" },
            { entity: { equals: 'VED', mode: 'insensitive' } }
          ]
        },
        orderBy: { created_at: 'desc' }
      });
    } else {
      return await prisma.knowledge.findMany({
        orderBy: { created_at: 'desc' }
      });
    }
  } catch (err) {
    console.error('[PostgreSQL/Prisma] Error fetching knowledge:', err.message);
    return [];
  }
}

/**
 * Add a new knowledge source.
 */
async function addKnowledge(data) {
  try {
    const doc = await prisma.knowledge.create({
      data: {
        title: data.title,
        content: data.content,
        entity: data.entity,
        type: data.type
      }
    });
    return doc;
  } catch (err) {
    console.error('[PostgreSQL/Prisma] Error adding knowledge:', err.message);
    return null;
  }
}

/**
 * Delete a knowledge source.
 */
async function deleteKnowledge(id) {
  try {
    await prisma.knowledge.delete({
      where: { id }
    });
    return true;
  } catch (err) {
    console.error('[PostgreSQL/Prisma] Error deleting knowledge:', err.message);
    return false;
  }
}

module.exports = {
  connect,
  getDb,
  closeConnection,
  saveCall,
  getEntityCalls,
  getCallMemory,
  saveCallSummary,
  getAllAnalytics,
  getKnowledge,
  addKnowledge,
  deleteKnowledge
};
