const mongoose = require('mongoose');

module.exports = async function connectDB() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mydb';
    const opts = { useNewUrlParser: true, useUnifiedTopology: true };
    await mongoose.connect(uri, opts);
    console.log('Connected to MongoDB');
    return mongoose;
};
