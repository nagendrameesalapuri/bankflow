import { query } from '../db/pool';

export interface DocumentRow {
  id: string;
  user_id: string;
  doc_type: string;
  original_filename: string;
  file_path: string;
  status: string;
  created_at: Date;
}

export async function create(input: {
  userId: string;
  docType: string;
  originalFilename: string;
  filePath: string;
}): Promise<DocumentRow> {
  const { rows } = await query<DocumentRow>(
    `INSERT INTO documents (user_id, doc_type, original_filename, file_path) VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.userId, input.docType, input.originalFilename, input.filePath],
  );
  return rows[0];
}

export async function listByUser(userId: string): Promise<DocumentRow[]> {
  const { rows } = await query<DocumentRow>('SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC', [
    userId,
  ]);
  return rows;
}

export async function findById(id: string): Promise<DocumentRow | null> {
  const { rows } = await query<DocumentRow>('SELECT * FROM documents WHERE id = $1', [id]);
  return rows[0] ?? null;
}
