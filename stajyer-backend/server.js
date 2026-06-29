console.log("Sunucu başlatıldı, kod okunuyor...");

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 1. TÜM STAJYERLERİ GETİR
app.get("/api/stajyerler", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM stajyerler ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Veritabanı listeleme hatası:", err);
    res.status(500).json({
      error: "Veritabanı hatası",
      detail: err.message,
    });
  }
});

// 2. YENİ STAJYER EKLE
app.post("/api/stajyerler", async (req, res) => {
  try {
    const {
      ad,
      soyad,
      departman,
      baslangic_tarihi,
      bitis_tarihi,
      foto_url,
    } = req.body;

    if (!ad || !soyad || !baslangic_tarihi || !bitis_tarihi) {
      return res.status(400).json({
        error: "Ad, soyad, başlangıç tarihi ve bitiş tarihi zorunludur",
      });
    }

    if (new Date(bitis_tarihi) < new Date(baslangic_tarihi)) {
      return res.status(400).json({
        error: "Bitiş tarihi başlangıç tarihinden önce olamaz",
      });
    }

    const query = `
      INSERT INTO stajyerler 
      (ad, soyad, departman, baslangic_tarihi, bitis_tarihi, foto_url, statu)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      ad,
      soyad,
      departman || null,
      baslangic_tarihi,
      bitis_tarihi,
      foto_url || null,
      "Staj Planlandı",
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Stajyer ekleme hatası:", err);
    res.status(500).json({
      error: "Ekleme hatası",
      detail: err.message,
    });
  }
});

// 3. STAJYERİ SİL
app.delete("/api/stajyerler/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM stajyerler WHERE id = $1", [id]);

    res.json({ message: "Stajyer silindi" });
  } catch (err) {
    console.error("Stajyer silme hatası:", err);
    res.status(500).json({
      error: "Silme hatası",
      detail: err.message,
    });
  }
});

// 4. STAJYER STATÜSÜ DEĞİŞTİR
app.patch("/api/stajyerler/:id/statu", async (req, res) => {
  try {
    const { id } = req.params;
    const { statu } = req.body;

    if (!statu) {
      return res.status(400).json({ error: "Statü zorunludur" });
    }

    const result = await pool.query(
      "UPDATE stajyerler SET statu = $1 WHERE id = $2 RETURNING *",
      [statu, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Statü değiştirme hatası:", err);
    res.status(500).json({
      error: "Statü değiştirme hatası",
      detail: err.message,
    });
  }
});

// TEST ENDPOINT
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend ve Supabase bağlantısı çalışıyor ✅" });
});

// ANA SAYFA TEST
app.get("/", (req, res) => {
  res.send("Stajyer backend çalışıyor ✅");
});

// SUNUCU BAŞLATMA
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});

server.on("error", (err) => {
  console.error("Sunucu başlatma hatası:", err);
});