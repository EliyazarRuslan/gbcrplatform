import { getPool, sql } from './db';

export async function logAudit(params: {
  userId: number | null;
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string;
}): Promise<void> {
  try {
    const pool = await getPool();
    await pool.request()
      .input('user_id', sql.Int, params.userId)
      .input('action', sql.VarChar, params.action)
      .input('entity_type', sql.VarChar, params.entityType)
      .input('entity_id', sql.Int, params.entityId || null)
      .input('old_values', sql.NVarChar, params.oldValues ? JSON.stringify(params.oldValues) : null)
      .input('new_values', sql.NVarChar, params.newValues ? JSON.stringify(params.newValues) : null)
      .input('ip_address', sql.VarChar, params.ipAddress || null)
      .query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
              VALUES (@user_id, @action, @entity_type, @entity_id, @old_values, @new_values, @ip_address)`);
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}
