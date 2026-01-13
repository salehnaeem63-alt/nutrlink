const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(5000, () => {
  console.log(`Server running on port ${PORT}`);
});