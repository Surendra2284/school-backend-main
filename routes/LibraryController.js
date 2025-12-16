const Book = require('../models/Book');
const LibraryTransaction = require('../models/libraryTransaction');

exports.getBooks = async (req, res) => {
  res.json(await Book.find());
};

exports.issueBook = async (req, res) => {
  const { bookId, studentId } = req.body;
  const book = await Book.findById(bookId);
  if (book.availableCopies <= 0)
    return res.status(400).json({ message: 'Book not available' });

  book.availableCopies--;
  await book.save();

  await LibraryTransaction.create({
    book: bookId,
    student: studentId,
    type: 'ISSUE'
  });

  res.json({ message: 'Book issued successfully' });
};
