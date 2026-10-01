export default async function handler(req, res) {
  const API_KEY = process.env.MOVIE_API_KEY; 
  const { action, query, slug } = req.query;

  // 1. Cek apakah Environment Variable terbaca
  if (!API_KEY) {
    return res.status(500).json({ 
      status: 'error', 
      message: 'MOVIE_API_KEY tidak ditemukan! Cek Environment Variables di Vercel.' 
    });
  }

  const BASE_URL = 'https://api.themoviedb.org/3';
  const IMG_URL = 'https://image.tmdb.org/t/p/w500';

  try {
    let fetchUrl = '';
    if (slug) {
      fetchUrl = `${BASE_URL}/movie/${slug}?api_key=${API_KEY}&language=id-ID`;
    } else if (action === 'search') {
      fetchUrl = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=id-ID`;
    } else if (action === 'rating') {
      fetchUrl = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=id-ID`;
    } else {
      fetchUrl = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=id-ID`;
    }

    const response = await fetch(fetchUrl);
    const rawData = await response.json();

    // 2. Jika TMDB menolak request (misal API Key salah)
    if (!response.ok) {
      return res.status(response.status).json({
        status: 'error',
        pesan_tmdb: rawData.status_message || 'API Key TMDB tidak valid / ditolak TMDB',
        code: response.status
      });
    }

    // 3. Response untuk Detail Film
    if (slug) {
      return res.status(200).json({
        status: 'success',
        data: {
          title: rawData.title,
          synopsis: rawData.overview || 'Sinopsis tidak tersedia.',
          serverPlayer: [
            { server: "Server 1 (Utama)", embed: `https://vidsrc.xyz/embed/movie/${rawData.id}` },
            { server: "Server 2 (Alternatif)", embed: `https://multiembed.mov/?video_id=${rawData.id}&tmdb=1` }
          ]
        }
      });
    }

    // 4. Response untuk List Film
    const formattedMovies = (rawData.results || []).map(movie => ({
      title: movie.title,
      thumbnail: movie.poster_path ? `${IMG_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
      slug: movie.id.toString()
    }));

    return res.status(200).json({ status: 'success', data: formattedMovies });

  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
