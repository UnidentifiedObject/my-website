const translations = {
  en: {
    aboutTitle: "About Me",
    aboutText: "Hi! My name is Cevdet Ünver, I'm a software developer with a passion for building creative and interactive projects.  I enjoy learning coding and exploring new technologies, including machine learning. As a recent graduate, I am open to work and eager to contribute to exciting projects.",
    contactText: "You can reach me professionally via LinkedIn:"
  },
  tr: {
    aboutTitle: "Hakkımda",
    aboutText: "Merhaba! Benim adım Cevdet Ünver, yaratıcı ve etkileşimli projeler geliştirmeye tutkuyla bağlı bir yazılım geliştiricisiyim. Kodlamayı öğrenmekten ve makine öğrenimi de dahil olmak üzere yeni teknolojileri keşfetmekten keyif alıyorum. Yeni mezun olarak çalışmaya açığım ve heyecan verici projelere katkıda bulunmaya hevesliyim.",
    contactText: "Profesyonel olarak LinkedIn üzerinden bana ulaşabilirsiniz:"
  }
};

function setLanguage(lang) {
  document.getElementById('about-title').innerText = translations[lang].aboutTitle;
  document.getElementById('about-text').innerText = translations[lang].aboutText;
  document.getElementById('contact-text').innerText = translations[lang].contactText;
}


