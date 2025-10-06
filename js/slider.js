const slides = document.querySelector('.slides');
const slideCount = document.querySelectorAll('.slide').length;
let index = 0;

function showSlide(i) {
  if (i < 0) i = slideCount - 1;
  if (i >= slideCount) i = 0;
  index = i;
  slides.style.transform = `translateX(-${index * 100}%)`;
}

// Auto-slide
let slideInterval = setInterval(() => showSlide(index + 1), 3000);

// Arrow controls
document.querySelector('.arrow.prev').addEventListener('click', () => {
  showSlide(index - 1);
  resetInterval();
});

document.querySelector('.arrow.next').addEventListener('click', () => {
  showSlide(index + 1);
  resetInterval();
});

function resetInterval() {
  clearInterval(slideInterval);
  slideInterval = setInterval(() => showSlide(index + 1), 3000);
}
