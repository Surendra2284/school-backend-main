const Book = require('../models/Book');

const LibraryTransaction =
  require('../models/libraryTransaction');

const { emitNoticeChanged } =
  require('../server');

/* =========================================================
   GET ALL BOOKS
========================================================= */

exports.getBooks = async (req, res) => {

  try {

    const books = await Book.find()
      .sort({ createdAt: -1 });

    return res.status(200).json(books);

  } catch (error) {

    console.error(
      'Error fetching books:',
      error
    );

    return res.status(500).json({
      message: 'Error fetching books.',
      error: error.message
    });
  }
};

/* =========================================================
   GET SINGLE BOOK
========================================================= */

exports.getBookById = async (req, res) => {

  try {

    const book = await Book.findById(
      req.params.id
    );

    if (!book) {

      return res.status(404).json({
        message: 'Book not found.'
      });
    }

    return res.status(200).json(book);

  } catch (error) {

    console.error(
      'Error fetching book:',
      error
    );

    return res.status(500).json({
      message: 'Error fetching book.',
      error: error.message
    });
  }
};

/* =========================================================
   ADD NEW BOOK
========================================================= */

exports.addBook = async (req, res) => {

  try {

    const {
      title,
      author,
      category,
      totalCopies,
      availableCopies,
      isbn,
      publishedYear
    } = req.body;

    if (
      !title ||
      !author ||
      totalCopies == null
    ) {

      return res.status(400).json({
        message:
          'title, author and totalCopies are required.'
      });
    }

    const book = new Book({

      title,

      author,

      category,

      isbn,

      publishedYear,

      totalCopies,

      availableCopies:
        availableCopies ??
        totalCopies
    });

    await book.save();

    // SSE EVENT
    emitNoticeChanged({

      type: 'library-book-added',

      bookId: book._id,

      title: book.title
    });

    return res.status(201).json({

      message:
        'Book added successfully.',

      book
    });

  } catch (error) {

    console.error(
      'Error adding book:',
      error
    );

    return res.status(500).json({
      message: 'Error adding book.',
      error: error.message
    });
  }
};

/* =========================================================
   UPDATE BOOK
========================================================= */

exports.updateBook = async (req, res) => {

  try {

    const updatedBook =
      await Book.findByIdAndUpdate(

        req.params.id,

        req.body,

        {
          new: true,
          runValidators: true
        }
      );

    if (!updatedBook) {

      return res.status(404).json({
        message: 'Book not found.'
      });
    }

    // SSE EVENT
    emitNoticeChanged({

      type: 'library-book-updated',

      bookId: updatedBook._id
    });

    return res.status(200).json({

      message:
        'Book updated successfully.',

      book: updatedBook
    });

  } catch (error) {

    console.error(
      'Error updating book:',
      error
    );

    return res.status(500).json({
      message: 'Error updating book.',
      error: error.message
    });
  }
};

/* =========================================================
   DELETE BOOK
========================================================= */

exports.deleteBook = async (req, res) => {

  try {

    const deletedBook =
      await Book.findByIdAndDelete(
        req.params.id
      );

    if (!deletedBook) {

      return res.status(404).json({
        message: 'Book not found.'
      });
    }

    // SSE EVENT
    emitNoticeChanged({

      type: 'library-book-deleted',

      bookId: req.params.id
    });

    return res.status(200).json({

      message:
        'Book deleted successfully.'
    });

  } catch (error) {

    console.error(
      'Error deleting book:',
      error
    );

    return res.status(500).json({
      message: 'Error deleting book.',
      error: error.message
    });
  }
};

/* =========================================================
   ISSUE BOOK
========================================================= */

exports.issueBook = async (req, res) => {

  try {

    const {
      bookId,
      studentId
    } = req.body;

    if (!bookId || !studentId) {

      return res.status(400).json({
        message:
          'bookId and studentId are required.'
      });
    }

    const book = await Book.findById(
      bookId
    );

    if (!book) {

      return res.status(404).json({
        message: 'Book not found.'
      });
    }

    if (book.availableCopies <= 0) {

      return res.status(400).json({
        message:
          'Book is not available.'
      });
    }

    // Reduce available copies
    book.availableCopies -= 1;

    await book.save();

    // Create transaction
    const transaction =
      await LibraryTransaction.create({

        book: bookId,

        student: studentId,

        type: 'ISSUE',

        issuedAt: new Date()
      });

    // SSE EVENT
    emitNoticeChanged({

      type: 'library-book-issued',

      bookId,

      studentId
    });

    return res.status(200).json({

      message:
        'Book issued successfully.',

      transaction
    });

  } catch (error) {

    console.error(
      'Error issuing book:',
      error
    );

    return res.status(500).json({
      message: 'Error issuing book.',
      error: error.message
    });
  }
};

/* =========================================================
   RETURN BOOK
========================================================= */

exports.returnBook = async (req, res) => {

  try {

    const {
      transactionId
    } = req.body;

    if (!transactionId) {

      return res.status(400).json({
        message:
          'transactionId is required.'
      });
    }

    const transaction =
      await LibraryTransaction.findById(
        transactionId
      );

    if (!transaction) {

      return res.status(404).json({
        message:
          'Transaction not found.'
      });
    }

    if (transaction.type === 'RETURN') {

      return res.status(400).json({
        message:
          'Book already returned.'
      });
    }

    const book = await Book.findById(
      transaction.book
    );

    if (!book) {

      return res.status(404).json({
        message: 'Book not found.'
      });
    }

    // Increase copies
    book.availableCopies += 1;

    await book.save();

    // Mark transaction returned
    transaction.type = 'RETURN';

    transaction.returnedAt = new Date();

    await transaction.save();

    // SSE EVENT
    emitNoticeChanged({

      type: 'library-book-returned',

      bookId: book._id,

      studentId:
        transaction.student
    });

    return res.status(200).json({

      message:
        'Book returned successfully.',

      transaction
    });

  } catch (error) {

    console.error(
      'Error returning book:',
      error
    );

    return res.status(500).json({
      message:
        'Error returning book.',
      error: error.message
    });
  }
};

/* =========================================================
   GET ALL TRANSACTIONS
========================================================= */

exports.getTransactions =
  async (req, res) => {

    try {

      const transactions =
        await LibraryTransaction.find()

          .populate(
            'book',
            'title author'
          )

          .populate(
            'student',
            'name studentId'
          )

          .sort({
            createdAt: -1
          });

      return res.status(200).json(
        transactions
      );

    } catch (error) {

      console.error(
        'Error fetching transactions:',
        error
      );

      return res.status(500).json({
        message:
          'Error fetching transactions.',
        error: error.message
      });
    }
  };