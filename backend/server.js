const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Document = require('./DocumentModel');

dotenv.config();

const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URI, {
			useUnifiedTopology: true,
			useNewUrlParser: true,
		});

		console.log(`MongoDB Connected to: ${conn.connection.host}`);
	} catch (error) {
		console.error(`Failed to Connect to MongoDB: ${error.message}`);
		process.exit(1);
	}
};

connectDB();

const io = require('socket.io')(3001, {
	cors: {
		origin: 'http://localhost:3000',
		methods: ['GET', 'POST'],
	},
});

const defaultValue = '';

io.on('connection', (socket) => {
	socket.on('get-document', async (documentId) => {
		const document = await findOrCreateDocument(documentId);
		socket.join(documentId);
		socket.emit('load-document', document.data);
		socket.on('send-changes', (delta) => {
			socket.broadcast.to(documentId).emit('receive-changes', delta);
		});

		socket.on('save-document', async (data) => {
			await Document.findByIdAndUpdate(documentId, { data });
		});
	});
});

const findOrCreateDocument = async (id) => {
	if (id == null) return;

	const document = await Document.findById(id);
	if (document) return document;

	return await Document.create({ _id: id, data: defaultValue });
};
