/**
 * Unit tests for the solver module
 */
import { SudokuSolver, generatePuzzle } from './solver.js';
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

// Run the tests
function runTests() {
    console.log('Running SudokuSolver tests...');
    
    testBasicSolving();
    testConstraintPropagation();
    testMultipleSolutions();
    testDifficulty();
    testPuzzleGeneration();
    
    console.log('All solver tests passed!');
}

// Test basic solving functionality
function testBasicSolving() {
    console.log('Testing basic solving...');
    
    const samplePuzzle = [
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
    
    // Create a board with the sample puzzle
    const board = new SudokuBoard();
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (samplePuzzle[row][col] !== 0) {
                board.setValue(row, col, samplePuzzle[row][col], true);
            }
        }
    }
    
    // Create a solver with the board
    const solver = new SudokuSolver(board);
    
    // Solve the puzzle
    const result = solver.solve();
    
    // Verify the result
    assert(result.solved, 'Puzzle should be solvable');
    assertEqual(result.count, 1, 'Should find exactly one solution');
    
    // Verify that the solution is valid
    const solvedBoard = result.solutions[0];
    assert(solvedBoard.isValid(), 'Solution should be valid');
    assert(solvedBoard.isComplete(), 'Solution should be complete');
    
    console.log('Basic solving tests passed!');
}

// Test constraint propagation
function testConstraintPropagation() {
    console.log('Testing constraint propagation...');
    
    // Create a board that can be solved by constraint propagation alone
    const easyPuzzle = [
        [0, 0, 0, 2, 6, 0, 7, 0, 1],
        [6, 8, 0, 0, 7, 0, 0, 9, 0],
        [1, 9, 0, 0, 0, 4, 5, 0, 0],
        [8, 2, 0, 1, 0, 0, 0, 4, 0],
        [0, 0, 4, 6, 0, 2, 9, 0, 0],
        [0, 5, 0, 0, 0, 3, 0, 2, 8],
        [0, 0, 9, 3, 0, 0, 0, 7, 4],
        [0, 4, 0, 0, 5, 0, 0, 3, 6],
        [7, 0, 3, 0, 1, 8, 0, 0, 0]
    ];
    
    const board = new SudokuBoard();
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (easyPuzzle[row][col] !== 0) {
                board.setValue(row, col, easyPuzzle[row][col], true);
            }
        }
    }
    
    // Create a solver with the board and record steps
    const solver = new SudokuSolver(board);
    const result = solver.solve({ recordSteps: true });
    
    // Verify the result
    assert(result.solved, 'Puzzle should be solvable');
    assert(solver.steps.length > 0, 'Should record solving steps');
    
    // Check that some steps are constraint propagation
    const nakedSingles = solver.steps.filter(step => step.type === 'naked_single');
    const hiddenSingles = solver.steps.filter(step => step.type === 'hidden_single');
    
    assert(nakedSingles.length > 0, 'Should find naked singles');
    assert(hiddenSingles.length > 0, 'Should find hidden singles');
    
    console.log('Constraint propagation tests passed!');
}

// Test multiple solution detection
function testMultipleSolutions() {
    console.log('Testing multiple solution detection...');
    
    // Create a board with multiple solutions (too few givens)
    const ambiguousPuzzle = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 3, 0, 8, 5],
        [0, 0, 1, 0, 2, 0, 0, 0, 0],
        [0, 0, 0, 5, 0, 7, 0, 0, 0],
        [0, 0, 4, 0, 0, 0, 1, 0, 0],
        [0, 9, 0, 0, 0, 0, 0, 0, 0],
        [5, 0, 0, 0, 0, 0, 0, 7, 3],
        [0, 0, 2, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 4, 0, 0, 0, 9]
    ];
    
    const board = new SudokuBoard();
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (ambiguousPuzzle[row][col] !== 0) {
                board.setValue(row, col, ambiguousPuzzle[row][col], true);
            }
        }
    }
    
    // Create a solver with the board
    const solver = new SudokuSolver(board);
    
    // Check uniqueness
    const hasUnique = solver.hasUniqueSolution(board);
    assert(!hasUnique, 'Should detect multiple solutions');
    
    // Find multiple solutions
    const result = solver.solve({ findAll: true });
    assert(result.count > 1, 'Should find multiple solutions');
    
    console.log('Multiple solution detection tests passed!');
}

// Test difficulty calculation
function testDifficulty() {
    console.log('Testing difficulty calculation...');
    
    // Create boards of different difficulty levels
    const easyPuzzle = [
        [0, 0, 0, 2, 6, 0, 7, 0, 1],
        [6, 8, 0, 0, 7, 0, 0, 9, 0],
        [1, 9, 0, 0, 0, 4, 5, 0, 0],
        [8, 2, 0, 1, 0, 0, 0, 4, 0],
        [0, 0, 4, 6, 0, 2, 9, 0, 0],
        [0, 5, 0, 0, 0, 3, 0, 2, 8],
        [0, 0, 9, 3, 0, 0, 0, 7, 4],
        [0, 4, 0, 0, 5, 0, 0, 3, 6],
        [7, 0, 3, 0, 1, 8, 0, 0, 0]
    ];
    
    const hardPuzzle = [
        [1, 0, 0, 0, 0, 7, 0, 9, 0],
        [0, 3, 0, 0, 2, 0, 0, 0, 8],
        [0, 0, 9, 6, 0, 0, 5, 0, 0],
        [0, 0, 5, 3, 0, 0, 9, 0, 0],
        [0, 1, 0, 0, 8, 0, 0, 0, 2],
        [6, 0, 0, 0, 0, 4, 0, 0, 0],
        [3, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 4, 0, 0, 0, 0, 0, 0, 7],
        [0, 0, 7, 0, 0, 0, 3, 0, 0]
    ];
    
    // Test easy puzzle
    const easyBoard = new SudokuBoard();
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (easyPuzzle[row][col] !== 0) {
                easyBoard.setValue(row, col, easyPuzzle[row][col], true);
            }
        }
    }
    
    const easySolver = new SudokuSolver(easyBoard);
    const easyDifficulty = easySolver.calculateDifficulty();
    
    console.log(`Easy puzzle difficulty: ${easyDifficulty}`);
    assert(easyDifficulty <= 2, 'Easy puzzle should have low difficulty rating');
    
    // Test hard puzzle
    const hardBoard = new SudokuBoard();
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (hardPuzzle[row][col] !== 0) {
                hardBoard.setValue(row, col, hardPuzzle[row][col], true);
            }
        }
    }
    
    const hardSolver = new SudokuSolver(hardBoard);
    const hardDifficulty = hardSolver.calculateDifficulty();
    
    console.log(`Hard puzzle difficulty: ${hardDifficulty}`);
    assert(hardDifficulty >= 3, 'Hard puzzle should have high difficulty rating');
    
    console.log('Difficulty calculation tests passed!');
}

// Test puzzle generation
function testPuzzleGeneration() {
    console.log('Testing puzzle generation...');
    
    // Generate puzzles of different difficulties
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
        console.log(`Generating puzzle with difficulty ${difficulty}...`);
        
        const puzzle = generatePuzzle(difficulty);
        
        // Verify the puzzle is valid
        assert(puzzle instanceof SudokuBoard, 'Generated puzzle should be a SudokuBoard');
        assert(puzzle.isValid(), 'Generated puzzle should be valid');
        
        // Count givens
        let givens = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (puzzle.grid[row][col] !== 0) {
                    givens++;
                    assert(puzzle.isGiven[row][col], 'Non-zero cells should be marked as given');
                }
            }
        }
        
        console.log(`Generated puzzle has ${givens} givens`);
        
        // Verify the puzzle has a unique solution
        const solver = new SudokuSolver();
        const hasUnique = solver.hasUniqueSolution(puzzle);
        assert(hasUnique, 'Generated puzzle should have a unique solution');
        
        // Verify the difficulty is appropriate
        const calculatedDifficulty = solver.calculateDifficulty();
        console.log(`Generated puzzle calculated difficulty: ${calculatedDifficulty}`);
        
        // Allow some flexibility in difficulty (±1)
        assert(
            Math.abs(calculatedDifficulty - difficulty) <= 1,
            `Generated puzzle difficulty (${calculatedDifficulty}) should be close to requested (${difficulty})`
        );
    }
    
    console.log('Puzzle generation tests passed!');
}

// Run all tests
runTests(); 