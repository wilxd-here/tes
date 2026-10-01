// File: api/will-movies.js
export default async function handler(req, res) {
  // Vercel akan membaca API Key (173628171682) dari Environment Variables di sini
  const apiKey = process.env.TMDB_API_KEY; 
  
  // Tangkap permintaan dari frontend (action=home, action=search, dll)
  const { action, query, slug } = req.query;

  try {
    // CONTOH: Request ke server API film aslinya menggunakan apiKey lu
    // const response = await fetch(`https://api.serverfilm.com/?action=${action}&key=${apiKey}`);
    // const data = await response.json();

    // Frontend lu minta format balikan JSON seperti ini:
    res.status(200).json({
      status: 'success',
      data: [] // Ganti array kosong ini dengan data.results dari API film asli lu
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Gagal mengambil data film' });
  }
}
