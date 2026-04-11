require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../model/User');
const bcrypt = require('bcryptjs');
const Nutritionist = require('../model/Nutritionist');
const Appointment = require('../model/Appointment');

// Import your existing connection
require('../config/db');

const mockData = [
  { username: 'Sami', email: 'sami@test.com', pic: 'https://th.bing.com/th/id/OIP.82UhyjS5XCHs-PYd3BSSUwHaEK?w=272&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3' },
  { username: 'Laila', email: 'laila@test.com', pic: 'https://th.bing.com/th/id/OIP.e6voHjED4omwbyU6TqoCmwHaE8?w=239&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3' },
  { username: 'Omar', email: 'omar@test.com', pic: 'https://tse1.mm.bing.net/th/id/OIP.X9fwmmR6rLnQJSoRiDudogHaHV?rs=1&pid=ImgDetMain&o=7&rm=3' },
  { username: 'Noor', email: 'noor@test.com', pic: 'https://th.bing.com/th/id/OIP.iOxMMRwVw1JQM7WHLaxwmgHaEM?w=311&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3' },
  { username: 'Zaid', email: 'zaid@test.com', pic: 'https://tse1.mm.bing.net/th/id/OIP.dfS06HnJj5wXc5WfWQd6bQHaE7?rs=1&pid=ImgDetMain&o=7&rm=3' },
  { username: 'Ali', email: 'ali@test.com', pic: 'https://i.pinimg.com/550x/f4/1f/c3/f41fc3f6db31cc249e114dfafc72e9cc.jpg' },
  { username: 'Omer', email: 'omer@test.com', pic: 'https://tse3.mm.bing.net/th/id/OIP.Ogo7SswTG3ARSaqUgNyCmAHaEK?rs=1&pid=ImgDetMain&o=7&rm=3' }
];

const seedDB = async () => {
  const SALT_ROUNDS = 10;
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log("⏳ Connecting to Atlas...");
      await mongoose.connect(process.env.MONGO_URI);
    }

    console.log("🚀 Connection established. Starting Safe Seeding...");

    // 1. EXTRACT ALL USERNAMES FROM MOCK DATA
    const mockUsernames = mockData.map(d => d.username);

    // 2. CLEANUP: Delete previous test data to prevent duplicates
    console.log("Cleaning up conflicting mock accounts...");
    const existingUsers = await User.find({
      $or: [
        { email: { $regex: /@test\.com$/ } },
        { username: { $in: mockUsernames } }
      ]
    });

    const idsToDelete = existingUsers.map(u => u._id);

    if (idsToDelete.length > 0) {
      await User.deleteMany({ _id: { $in: idsToDelete } });
      await Nutritionist.deleteMany({ user: { $in: idsToDelete } });
      await Appointment.deleteMany({ nutritionistId: { $in: idsToDelete } });
      console.log(`Successfully removed ${idsToDelete.length} old accounts.`);
    }

    const hashedPassword = await bcrypt.hash('password123', SALT_ROUNDS);

    for (let data of mockData) {
      // 1. Create User
      const newUser = await User.create({
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: 'nutritionist',
        isApproved: true,
        profilePic: data.pic,
      });


      // --- RANDOMIZER LOGIC ---
      // IMPORTANT: Only use values that exist in your Nutritionist model's ENUM
      const validSpecs = ['Weight Loss', 'Muscle Building', 'Diabetic Diet', 'Sports Nutrition', 'General Health'];

      // Function to shuffle properly
      const shuffle = (array) => {
        let currentIndex = array.length;
        while (currentIndex !== 0) {
          let randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex--;
          [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
        return array;
      };

      const randomSpecs = shuffle([...validSpecs]).slice(0, 2);

      const randomPrice = Math.floor(Math.random() * (70 - 30 + 1)) + 30;
      const highRating = (Math.random() * (5.0 - 3.0) + 3.0).toFixed(1);
      const randomReviews = Math.floor(Math.random() * 200) + 10;

      // 2. Create Nutritionist
      await Nutritionist.create({
        user: newUser._id,
        specialization: randomSpecs,
        price: randomPrice,
        rating: Number(highRating),
        reviewCount: randomReviews,
        cardBio: `Hi, I'm Dr. ${data.username}. Certified expert in ${randomSpecs[0]}.`,
        languages: ['Arabic', 'English']
      });

      // 3. Create Appointment
      const slots = ["09:00 AM - 10:00 AM", "11:00 AM - 12:00 PM", "04:00 PM - 05:00 PM"];
      const randomSlot = slots[Math.floor(Math.random() * slots.length)];

      await Appointment.create({
        nutritionistId: newUser._id,
        date: new Date(),
        timeSlot: randomSlot,
        status: "available"
      });

      console.log(`✅ Seeded: ${data.username} (Rating: ${highRating})`);
    }

    console.log(`\n✨ Successfully seeded ${mockData.length} experts!`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding Error:", err);
    process.exit(1);
  }
};

seedDB();