const quotes = [
  "The only way to do great work is to love what you do.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Dream big and dare to fail.",
  "Believe you can and you're halfway there.",
  "What we think, we become."
];

export default function aboutPage() {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  return `
    <div class="text-center">
      <h1 class="text-3xl font-bold mb-4">About Us</h1>
      <p class="text-gray-400 mb-8">This is the about page demo content.</p>
      <div class="mt-8">
        <p class="text-2xl md:text-4xl font-semibold text-blue-300 italic">"${randomQuote}"</p>
      </div>
    </div>
  `;
}
