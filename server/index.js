const { app } = require('./app');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});
