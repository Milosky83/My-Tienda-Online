import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tienda_virtual',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const query = (text, params) => pool.query(text, params);
export const getOne = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows[0];
};
export const getAll = async (text, params) => {
  const result = await pool.query(text, params);
  return result.rows;
};
export const run = async (text, params) => {
  return await pool.query(text, params);
};

export default pool;