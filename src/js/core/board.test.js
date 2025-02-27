/**
 * Unit tests for the SudokuBoard class
 */
import SudokuBoard from './board.js';

// Simple test helpers
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
};

const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
};

const assertArrayEqual = (actual, expected, message) => {
    if (actual.length !== expected.length) {
        throw new Error(`${message || 'Assertion failed'}: arrays have different lengths`);
    }
    
    for (let i = 0; i < actual.length; i++) {
        if (Array.isArray(actual[i]) && Array.isArray(expected[i])) {
            assertArrayEqual(actual[i], expected[i], message);
        } else if (actual[i] !== expected[i]) {
            throw new Error(`${message || 'Assertion failed'}: arrays differ at index ${i}`);
        }
    }
};

// Run the tests
function runTests() {
    console.log('Running SudokuBoard tests...');
    
    testConstructor();
    testSetValue();
    testClearValue();
    testCandidates();
    testValidity();
    testClone();
    
    console.log('All tests passed!');
}

// Test constructor and initialization
function testConstructor() {
    console.log('Testing constructor...');
    
    // Test empty constructor
    const board1 = new SudokuBoard();
    assert(board1.grid.length === 9, 'Grid should have 9 rows');
    assert(board1.grid[0].length === 9, 'Grid should have 9 columns');
    
    // All cells should be empty
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            assert(board1.grid[row][col] === 0, `Cell [${row},${col}] should be empty`);
        }
    }
    
    // Test constructor with initial board
    const initialBoard = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];
    
    const board2 = new SudokuBoard(initialBoard);
    
    // Check that values were set correctly
    assertArrayEqual(board2.getBoard(), initialBoard, 'Initial board should be set correctly');
    
    // Check that given cells are marked
    assert(board2.isGiven[0][0] === true, 'Given cells should be marked');
    assert(board2.isGiven[2][2] === true, 'Given cells should be marked');
    
    // Check bit vectors for a specific row/column/box
    assert(board2.rowBits[0] === 0b101000100, 'Row bits should be set correctly');
    assert(board2.colBits[0] === 0b11010000, 'Column bits should be set correctly');
    
    console.log('Constructor tests passed!');
}

// Test setValue method
function testSetValue() {
    console.log('Testing setValue...');
    
    const board = new SudokuBoard();
    
    // Set a value
    assert(board.setValue(0, 0, 5) === true, 'Should return true for valid move');
    assertEqual(board.grid[0][0], 5, 'Cell value should be set');
    
    // Try to set a duplicate in the same row
    assert(board.setValue(0, 1, 5) === false, 'Should return false for duplicate in row');
    assertEqual(board.grid[0][1], 0, 'Cell should remain empty');
    
    // Try to set a duplicate in the same column
    assert(board.setValue(1, 0, 5) === false, 'Should return false for duplicate in column');
    assertEqual(board.grid[1][0], 0, 'Cell should remain empty');
    
    // Try to set a duplicate in the same box
    assert(board.setValue(1, 1, 5) === false, 'Should return false for duplicate in box');
    assertEqual(board.grid[1][1], 0, 'Cell should remain empty');
    
    // Set a valid value
    assert(board.setValue(1, 1, 6) === true, 'Should return true for valid move');
    assertEqual(board.grid[1][1], 6, 'Cell value should be set');
    
    // Try to modify a given cell
    board.isGiven[2][2] = true;
    board.grid[2][2] = 3;
    assert(board.setValue(2, 2, 4) === false, 'Should return false when modifying given cell');
    assertEqual(board.grid[2][2], 3, 'Given cell should not change');
    
    console.log('setValue tests passed!');
}

// Test clearValue method
function testClearValue() {
    console.log('Testing clearValue...');
    
    const board = new SudokuBoard();
    
    // Set some values
    board.setValue(0, 0, 5);
    board.setValue(0, 1, 3);
    
    // Clear a value
    assert(board.clearValue(0, 0) === true, 'Should return true when clearing cell');
    assertEqual(board.grid[0][0], 0, 'Cell should be empty after clearing');
    
    // Check bit vectors were updated
    assert((board.rowBits[0] & (1 << (5 - 1))) === 0, 'Bit for cleared value should be unset in row');
    
    // Try to clear a given cell
    board.setValue(1, 1, 6, true); // Set as given
    assert(board.clearValue(1, 1) === false, 'Should return false when clearing given cell');
    assertEqual(board.grid[1][1], 6, 'Given cell should not be cleared');
    
    console.log('clearValue tests passed!');
}

// Test candidates tracking
function testCandidates() {
    console.log('Testing candidates...');
    
    const board = new SudokuBoard();
    
    // Initially all cells should have all candidates
    let candidates = board.getCandidates(0, 0);
    assertEqual(candidates.length, 9, 'Empty cell should have 9 candidates');
    
    // Set a value and check candidates in affected cells
    board.setValue(0, 0, 5);
    
    // Check row
    candidates = board.getCandidates(0, 1);
    assert(!candidates.includes(5), 'Candidate 5 should be removed from cells in the same row');
    
    // Check column
    candidates = board.getCandidates(1, 0);
    assert(!candidates.includes(5), 'Candidate 5 should be removed from cells in the same column');
    
    // Check box
    candidates = board.getCandidates(1, 1);
    assert(!candidates.includes(5), 'Candidate 5 should be removed from cells in the same box');
    
    // Check that clearing a value restores candidates
    board.clearValue(0, 0);
    candidates = board.getCandidates(0, 1);
    assert(candidates.includes(5), 'Candidate 5 should be restored after clearing cell');
    
    console.log('Candidates tests passed!');
}

// Test validity checking
function testValidity() {
    console.log('Testing validity...');
    
    // Create a valid board
    const board = new SudokuBoard();
    board.setValue(0, 0, 5);
    board.setValue(0, 1, 3);
    
    assert(board.isValid() === true, 'Board should be valid');
    assert(board.isComplete() === false, 'Board should not be complete');
    
    // Create an invalid board with duplicates
    const invalidBoard = new SudokuBoard();
    // Manually set duplicate values to bypass validation
    invalidBoard.grid[0][0] = 5;
    invalidBoard.grid[0][1] = 5;
    
    assert(invalidBoard.isValid() === false, 'Board with duplicates should be invalid');
    
    // Create a complete board (simple 2x2 case)
    const completeBoard = new SudokuBoard();
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            // Set values 1-9 in a valid pattern
            completeBoard.grid[row][col] = ((row * 3 + Math.floor(row / 3) + col) % 9) + 1;
            
            // Update bit vectors manually
            const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
            const value = completeBoard.grid[row][col];
            completeBoard.rowBits[row] |= (1 << (value - 1));
            completeBoard.colBits[col] |= (1 << (value - 1));
            completeBoard.boxBits[boxIndex] |= (1 << (value - 1));
        }
    }
    
    assert(completeBoard.isValid() === true, 'Valid complete board should be valid');
    assert(completeBoard.isComplete() === true, 'Valid complete board should be complete');
    
    console.log('Validity tests passed!');
}

// Test clone method
function testClone() {
    console.log('Testing clone...');
    
    const board = new SudokuBoard();
    board.setValue(0, 0, 5);
    board.setValue(0, 1, 3);
    
    // Clone the board
    const clonedBoard = board.clone();
    
    // Check that values match
    assertArrayEqual(clonedBoard.getBoard(), board.getBoard(), 'Cloned board should have same values');
    
    // Check that bit vectors match
    assert(clonedBoard.rowBits[0] === board.rowBits[0], 'Cloned board should have same row bits');
    
    // Modify the original and check that clone remains unchanged
    board.setValue(1, 1, 6);
    assertEqual(clonedBoard.grid[1][1], 0, 'Cloned board should not be affected by changes to original');
    
    console.log('Clone tests passed!');
}

// Run all tests
runTests(); 