import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./tienda.db');

db.all("PRAGMA table_info(orders)", (err, columns) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Columnas en tabla orders:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
  }
  db.close();
});