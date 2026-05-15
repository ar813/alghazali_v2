
const query = "Islamic History Academic";
const category = undefined;
const searchTerm = category ? `${query} subject:${category}` : query;
const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerm)}&maxResults=5`;

console.log("Testing URL:", url);

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log("Found items:", data.items?.length || 0);
    if (data.items) {
      data.items.forEach((item, i) => {
        console.log(`${i+1}: ${item.volumeInfo.title}`);
      });
    }
  })
  .catch(err => console.error(err));
