export default async function handler(req, res) {
  // Mengambil API Key TMDB dari Environment Variable Vercel
  const API_KEY = process.env.MOVIE_API_KEY; 
  const { action, query, slug } = req.query;

  const BASE_URL = 'https://api.themoviedb.org/3';
  const IMG_URL = 'https://image.tmdb.org/t/p/w500'; // Base URL gambar TMDB

  try {
    // ==========================================
    // 1. JIKA KLIK DETAIL FILM (Buka Player)
    // ==========================================
    if (slug) {
      // Frontend mengirimkan "slug" (yang kita isi dengan ID TMDB)
      const response = await fetch(`${BASE_URL}/movie/${slug}?api_key=${API_KEY}&language=id-ID`);
      const data = await response.json();

      if (!data.id) throw new Error("Film tidak ditemukan");

      return res.status(200).json({
        status: 'success',
        data: {
          title: data.title,
          synopsis: data.overview || 'Sinopsis tidak tersedia.',
          // Gunakan ID TMDB untuk generate link streaming dari provider eksternal
          serverPlayer: [
            { server: "Server 1 (Utama)", embed: `https://vidsrc.xyz/embed/movie/${data.id}` },
            { server: "Server 2 (Alternatif)", embed: `https://multiembed.mov/?video_id=${data.id}&tmdb=1` }
          ]
        }
      });
    }

    // ==========================================
    // 2. JIKA LOAD HALAMAN UTAMA / CARI FILM
    // ==========================================
    let fetchUrl = '';
    if (action === 'search') {
      fetchUrl = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=id-ID`;
    } else if (action === 'rating') {
      fetchUrl = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=id-ID`;
    } else { // 'home' atau default
      fetchUrl = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=id-ID`;
    }

    const response = await fetch(fetchUrl);
    const rawData = await response.json();

    // Mapping/ubah nama variabel dari TMDB ke format yang diminta payload_movie.txt
    const formattedMovies = rawData.results.map(movie => ({
      title: movie.title,
      thumbnail: movie.poster_path ? `${IMG_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Image',
      slug: movie.id.toString() // Kita pakai ID TMDB sebagai slug agar mudah dicari saat diklik
    }));

    return res.status(200).json({
      status: 'success',
      data: formattedMovies
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil data dari TMDB' });
  }
}
