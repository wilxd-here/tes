export default async function handler(req, res) {
  // Set CORS biar gak diblokir browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, query, slug } = req.query;
  // Pastikan TMDB_API_KEY udah diisi di Environment Variables Vercel
  const TMDB_KEY = process.env.TMDB_API_KEY; 

  try {
    // 1. Jika klik detail film (menggunakan ID TMDB sebagai slug)
    if (slug) {
      const detailRes = await fetch(`https://api.themoviedb.org/3/movie/${slug}?api_key=${TMDB_KEY}&language=id-ID`);
      const detail = await detailRes.json();

      return res.status(200).json({
        status: 'success',
        data: {
          title: detail.title,
          synopsis: detail.overview || 'Tidak ada deskripsi.',
          thumbnail: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : '',
          serverPlayer: [
            { server: "Server 1 (Smashy)", embed: `https://player.smashy.stream/movie/${detail.id}` },
            { server: "Server 2 (2Embed)", embed: `https://www.2embed.cc/embed/${detail.id}` }
          ]
        }
      });
    }

    // 2. Tentukan Endpoint TMDB berdasarkan action
    let endpoint = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_KEY}&language=id-ID&page=1`;
    if (action === 'search' && query) {
      endpoint = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=id-ID`;
    } else if (action === 'rating') {
      endpoint = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_KEY}&language=id-ID&page=1`;
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    // Map data TMDB ke format yang dibaca HTML frontend
    const movies = (data.results || []).map(item => ({
      title: item.title,
      slug: item.id.toString(),
      // PENTING: Wajib gabungkan URL base TMDB ini biar gambarnya gak pecah/rusak
      thumbnail: item.poster_path 
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}` 
        : 'https://via.placeholder.com/300x450?text=No+Image'
    }));

    return res.status(200).json({ status: 'success', data: movies });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
