// Shared content for the site and the slideshow.
window.TT = {
  swish: '1236641567',
  swishPretty: '123 664 15 67',
  bankgiro: '138-2456',
  fee: '100 kr',
  web: 'www.hoinguoivietstockholm.org',
  email: 'info@hoinguoivietstockholm.org',
  facebook: 'Người Việt Stockholm',
  // Each line can carry stickers (ids in img/stickers.svg) so the programme reads at a glance.
  agenda: [
    { time: '14:00', title: 'Đón khách', stickers: ['starlantern', 'notes'], items: [
      { t: 'Nhạc Trung Thu: Chiếc đèn ông sao, Rước đèn tháng Tám, Thằng Cuội', s: ['notes'] },
      { t: 'Cho bé và người lớn: vẽ mặt · làm lồng đèn · trang trí mâm cỗ', s: ['facepaint', 'starlantern', 'fruit'] }] },
    { time: '14:30', title: 'Khai mạc', stickers: ['mic'], items: [
      { t: 'MC chào mừng, giới thiệu chương trình', s: ['mic'] },
      { t: 'Đại diện Hội Người Việt Stockholm phát biểu', s: [] }] },
    { time: '14:45', title: 'Trò chơi & biểu diễn', stickers: ['lion', 'drum'], items: [
      { t: 'Gió thổi, gió thổi · Tôi là vua · Con thỏ', s: ['pinwheel', 'crown', 'rabbit'] },
      { t: 'Kể chuyện Chú Cuội – Mai Phương', s: ['cuoi'] },
      { t: 'Pop dans – Linh', s: ['dance'] }] },
    { time: '15:15', title: 'Kahoot – Vui học Trung Thu', stickers: ['quiz'], items: [
      { t: '8–10 câu hỏi, trả lời nhanh & đúng', s: ['quiz'] },
      { t: 'Trao quà và sách cho người thắng', s: ['gift', 'book'] }] },
    { time: '15:30', title: 'Phá cỗ & rước đèn', stickers: ['mooncake', 'carp'], items: [
      { t: 'Trái cây, bánh Trung Thu, kẹo', s: ['fruit', 'mooncake', 'candy'] },
      { t: 'Rước đèn lồng, hát Chiếc đèn ông sao', s: ['starlantern', 'carp'] }] },
    { time: '16:15', title: 'Fika & vẽ mặt', stickers: ['fika', 'facepaint'], items: [] },
    { time: '17:00', title: 'Giao lưu văn nghệ', stickers: ['dance', 'notes'], items: [
      { t: 'Dạy nhảy Popdans & Bachata', s: ['dance'] }] },
  ],
  // Slideshow music, played in order and looped. Each song plays from audio/; if the file
  // is missing or fails, it streams the YouTube video instead (embedding allowed by the uploader).
  music: [
    { title: 'Rước đèn tháng Tám', src: 'audio/ruoc-den-thang-tam.mp3', youtube: 'iylStdeois0' },        // Đồ Rê Mí
    { title: 'Chiếc đèn ông sao', src: 'audio/chiec-den-ong-sao.mp3', youtube: 'ldEYSFxFEng' },          // LALATV
    { title: 'Thằng Cuội', src: 'audio/thang-cuoi.mp3', youtube: 'NhqhawkYquE' },                        // Đồ Rê Mí
    { title: 'Chiếc đèn ông sao (Đội Sơn Ca)', src: 'audio/chiec-den-ong-sao-son-ca.mp3', youtube: 'TcKxFTy2iLU' }, // thu thanh trước 1975
  ],
};
