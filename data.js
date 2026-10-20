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
  // Text is { vi, sv, en }; song and game names stay in Vietnamese.
  agenda: [
    { time: '14:00', stickers: ['starlantern', 'notes'],
      title: { vi: 'Đón khách', sv: 'Välkomna', en: 'Welcome' },
      items: [
        { s: ['notes'], t: {
          vi: 'Nhạc Trung Thu: Chiếc đèn ông sao, Rước đèn tháng Tám, Thằng Cuội',
          sv: 'Trung Thu-sånger: Chiếc đèn ông sao, Rước đèn tháng Tám, Thằng Cuội',
          en: 'Mid-Autumn songs: Chiếc đèn ông sao, Rước đèn tháng Tám, Thằng Cuội' } },
        { s: ['facepaint', 'starlantern', 'fruit'], t: {
          vi: 'Cho bé và người lớn: vẽ mặt · làm lồng đèn · trang trí mâm cỗ',
          sv: 'För barn och vuxna: ansiktsmålning · lyktpyssel · duka festbordet',
          en: 'For kids and grown-ups: face painting · lantern making · decorating the feast tray' } }] },
    { time: '14:30', stickers: ['mic'],
      title: { vi: 'Khai mạc', sv: 'Invigning', en: 'Opening' },
      items: [
        { s: ['mic'], t: {
          vi: 'MC chào mừng, giới thiệu chương trình',
          sv: 'Konferenciern hälsar välkommen och presenterar programmet',
          en: 'The MC welcomes everyone and introduces the programme' } },
        { s: [], t: {
          vi: 'Đại diện Hội Người Việt Stockholm phát biểu',
          sv: 'Tal av en representant för föreningen',
          en: 'A few words from the association' } }] },
    { time: '14:45', stickers: ['lion', 'drum'],
      title: { vi: 'Trò chơi & biểu diễn', sv: 'Lekar & uppträdanden', en: 'Games & performances' },
      items: [
        { s: ['pinwheel', 'crown', 'rabbit'], t: {
          vi: 'Gió thổi, gió thổi · Tôi là vua · Con thỏ',
          sv: 'Lekar: Gió thổi (Vinden blåser) · Tôi là vua (Jag är kung) · Con thỏ (Kaninen)',
          en: 'Games: Gió thổi (The wind blows) · Tôi là vua (I am the king) · Con thỏ (The rabbit)' } },
        { s: ['cuoi'], t: {
          vi: 'Kể chuyện Chú Cuội – Mai Phương',
          sv: 'Sagan om Chú Cuội – Mai Phương',
          en: 'The tale of Chú Cuội – Mai Phương' } },
        { s: ['dance'], t: { vi: 'Pop dans – Linh', sv: 'Popdans – Linh', en: 'Pop dance – Linh' } }] },
    { time: '15:15', stickers: ['quiz'],
      title: { vi: 'Kahoot – Vui học Trung Thu', sv: 'Kahoot – frågesport om Trung Thu', en: 'Kahoot – the Mid-Autumn quiz' },
      items: [
        { s: ['quiz'], t: {
          vi: '8–10 câu hỏi, trả lời nhanh & đúng',
          sv: '8–10 frågor – svara snabbt och rätt',
          en: '8–10 questions – answer fast and right' } },
        { s: ['gift', 'book'], t: {
          vi: 'Trao quà và sách cho người thắng',
          sv: 'Priser och böcker till vinnarna',
          en: 'Prizes and books for the winners' } }] },
    { time: '15:30', stickers: ['mooncake', 'carp'],
      title: { vi: 'Phá cỗ & rước đèn', sv: 'Festbord & lyktparad', en: 'Feast & lantern parade' },
      items: [
        { s: ['fruit', 'mooncake', 'candy'], t: {
          vi: 'Trái cây, bánh Trung Thu, kẹo',
          sv: 'Frukt, månkakor och godis',
          en: 'Fruit, mooncakes and sweets' } },
        { s: ['starlantern', 'carp'], t: {
          vi: 'Rước đèn lồng, hát Chiếc đèn ông sao',
          sv: 'Lyktparad och allsång: Chiếc đèn ông sao',
          en: 'Lantern parade, singing Chiếc đèn ông sao' } }] },
    { time: '16:15', stickers: ['fika', 'facepaint'],
      title: { vi: 'Fika & vẽ mặt', sv: 'Fika & ansiktsmålning', en: 'Fika & face painting' },
      items: [] },
    { time: '17:00', stickers: ['dance', 'notes'],
      title: { vi: 'Giao lưu văn nghệ', sv: 'Dans & mingel', en: 'Music, dance & mingling' },
      items: [
        { s: ['dance'], t: {
          vi: 'Dạy nhảy Popdans & Bachata',
          sv: 'Danslektion: popdans & bachata',
          en: 'Dance class: pop dance & bachata' } }] },
  ],
  // Slideshow music, played in order and looped. Each song plays from audio/; if the file
  // is missing or fails, it streams the YouTube video instead (embedding allowed by the uploader).
  music: [
    { title: 'Rước đèn tháng Tám', src: 'audio/ruoc-den-thang-tam.mp3', youtube: 'iylStdeois0' },        // Đồ Rê Mí
    { title: 'Chiếc đèn ông sao', src: 'audio/chiec-den-ong-sao.mp3', youtube: 'ldEYSFxFEng' },          // LALATV
    { title: 'Thằng Cuội', src: 'audio/thang-cuoi.mp3', youtube: 'NhqhawkYquE' },                        // Đồ Rê Mí
  ],
};
