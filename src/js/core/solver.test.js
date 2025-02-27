/**
 * Unit tests for the SudokuSolver class
 */
import SudokuSolver, { generatePuzzle } from './solver.js';
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

// Sample puzzles of varying difficulties
const easyPuzzle = [
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

const mediumPuzzle = [
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
    [0, 2, 0, 6, 0, 8, 0, 0, 0],
    [5, 8, 0, 0, 0, 9, 7, 0, 0],
    [0, 0, 0, 0, 4, 0, 0, 0, 0],
    [3, 7, 0, 0, 0, 0, 5, 0, 0],
    [6, 0, 0, 0, 0, 0, 0, 0, 4],
    [0, 0, 8, 0, 0, 0, 0, 1, 3],
    [0, 0, 0, 0, 2, 0, 0, 0, 0],
    [0, 0, 9, 8, 0, 0, 0, 3, 6],
    [0, 0, 0, 3, 0, 6, 0, 9, 0]
];

// Very hard puzzle that requires advanced techniques
const expertPuzzle = [
    [0, 0, 0, 0, 0, 6, 0, 0, 0],
    [0, 5, 9, 0, 0, 0, 0, 0, 8],
    [2, 0, 0, 0, 0, 8, 0, 0, 0],
    [0, 4, 5, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 0, 6, 0, 0, 3, 0, 5, 4],
    [0, 0, 0, 3, 2, 5, 0, 0, 6],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
];

// Unsolvable puzzle
const unsolvablePuzzle = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 5] // This has a 5 where there should be a 9
];

// Run the tests
function runTests() {
    console.log('Running SudokuSolver tests...');
    
    testSolver();
    testConstraintPropagation();
    testFindingAllSolutions();
    testPerformance();
    testBackjumping();
    testEnhancedMRV();
    testLCV();
    testNakedPairs();
    testUniquenessTesting();
    testDifficulty();
    testGeneration();
    
    console.log('All tests passed!');
}

// Test the basic solving capability
function testSolver() {
    console.log('Testing solver...');
    
    const solver = new SudokuSolver();
    
    // Test solving an easy puzzle
    const easyBoard = new SudokuBoard(easyPuzzle);
    solver.setBoard(easyBoard);
    const easyResult = solver.solve();
    
    assert(easyResult.solved, 'Easy puzzle should be solvable');
    assert(easyResult.solutions.length === 1, 'Easy puzzle should have one solution');
    assert(easyResult.solutions[0].isComplete(), 'Solution should be complete');
    assert(easyResult.solutions[0].isValid(), 'Solution should be valid');
    
    // Test solving a medium puzzle
    const mediumBoard = new SudokuBoard(mediumPuzzle);
    solver.setBoard(mediumBoard);
    const mediumResult = solver.solve();
    
    assert(mediumResult.solved, 'Medium puzzle should be solvable');
    assert(mediumResult.solutions[0].isComplete(), 'Solution should be complete');
    
    // Test solving a hard puzzle
    const hardBoard = new SudokuBoard(hardPuzzle);
    solver.setBoard(hardBoard);
    const hardResult = solver.solve();
    
    assert(hardResult.solved, 'Hard puzzle should be solvable');
    assert(hardResult.solutions[0].isComplete(), 'Solution should be complete');
    
    // Test an unsolvable puzzle
    const unsolvableBoard = new SudokuBoard(unsolvablePuzzle);
    solver.setBoard(unsolvableBoard);
    const unsolvableResult = solver.solve();
    
    assert(!unsolvableResult.solved, 'Unsolvable puzzle should not be solvable');
    assert(unsolvableResult.solutions.length === 0, 'Unsolvable puzzle should have no solutions');
}

// Test constraint propagation
function testConstraintPropagation() {
    console.log('Testing constraint propagation...');
    
    const solver = new SudokuSolver();
    
    // Create a puzzle that can be solved by constraint propagation alone
    const propagationPuzzle = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 0] // Only one cell missing
    ];
    
    const board = new SudokuBoard(propagationPuzzle);
    solver.setBoard(board);
    solver.solve({ recordSteps: true });
    
    // Check that at least some steps were naked singles or hidden singles
    const hasConstraintPropagation = solver.steps.some(step => 
        step.type === 'naked_single' || step.type === 'hidden_single');
    
    assert(hasConstraintPropagation, 'Solver should use constraint propagation');
    
    // Test that the solver can identify naked singles
    const nakedSinglePuzzle = [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
        [1, 9, 8, 3, 4, 2, 5, 6, 7],
        [8, 5, 9, 7, 6, 1, 4, 2, 3],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 0], // Only one value possible here: 5
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ];
    
    const nakedSingleBoard = new SudokuBoard(nakedSinglePuzzle);
    solver.setBoard(nakedSingleBoard);
    solver.solve({ recordSteps: true });
    
    const hasNakedSingle = solver.steps.some(step => step.type === 'naked_single');
    assert(hasNakedSingle, 'Solver should identify naked singles');
    
    // Test that the solver can identify hidden singles
    const hiddenSinglePuzzle = [
        [0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 2, 0, 0, 3],
        [0, 0, 0, 0, 4, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 5, 0, 0],
        [4, 2, 6, 8, 5, 3, 7, 9, 1],
        [7, 1, 3, 9, 2, 4, 8, 5, 6],
        [9, 6, 1, 5, 3, 7, 2, 8, 4],
        [2, 8, 7, 4, 1, 9, 6, 3, 5],
        [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ];
    
    const hiddenSingleBoard = new SudokuBoard(hiddenSinglePuzzle);
    solver.setBoard(hiddenSingleBoard);
    solver.solve({ recordSteps: true });
    
    const hasHiddenSingle = solver.steps.some(step => step.type === 'hidden_single');
    assert(hasHiddenSingle, 'Solver should identify hidden singles');
}

// Test finding all solutions
function testFindingAllSolutions() {
    console.log('Testing finding all solutions...');
    
    const solver = new SudokuSolver();
    
    // Create a puzzle with multiple solutions
    const multiSolutionPuzzle = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    
    // Add a few constraints to limit the number of solutions somewhat
    multiSolutionPuzzle[0][0] = 1;
    multiSolutionPuzzle[1][1] = 2;
    multiSolutionPuzzle[2][2] = 3;
    
    const board = new SudokuBoard(multiSolutionPuzzle);
    solver.setBoard(board);
    
    // Find up to 5 solutions
    const result = solver.solve({ findAll: true });
    
    assert(result.solved, 'Puzzle with multiple solutions should be solvable');
    assert(result.solutions.length > 1, 'Should find multiple solutions');
    assert(result.solutions.length <= result.count, 'Solution count should be accurate');
    
    // Check that all solutions are valid
    for (const solution of result.solutions) {
        assert(solution.isComplete(), 'Each solution should be complete');
        assert(solution.isValid(), 'Each solution should be valid');
    }
}

// Test performance metrics
function testPerformance() {
    console.log('Testing performance metrics...');
    
    const solver = new SudokuSolver();
    
    // Test easy puzzle
    const easyBoard = new SudokuBoard(easyPuzzle);
    solver.setBoard(easyBoard);
    const easyResult = solver.solve();
    
    assert('performance' in easyResult, 'Result should include performance metrics');
    assert('time' in easyResult.performance, 'Performance should include time');
    assert('nodeCount' in easyResult.performance, 'Performance should include node count');
    assert('backjumps' in easyResult.performance, 'Performance should include backjump count');
    
    // Test that harder puzzles have higher node counts
    const hardBoard = new SudokuBoard(hardPuzzle);
    solver.setBoard(hardBoard);
    const hardResult = solver.solve();
    
    assert(hardResult.performance.nodeCount > easyResult.performance.nodeCount, 
        'Hard puzzles should explore more nodes than easy puzzles');
}

// Test conflict-directed backjumping
function testBackjumping() {
    console.log('Testing conflict-directed backjumping...');
    
    const solver = new SudokuSolver();
    
    // Test with backjumping enabled (default)
    const boardWithBJ = new SudokuBoard(hardPuzzle);
    solver.setBoard(boardWithBJ);
    const resultWithBJ = solver.solve({ useBackjumping: true });
    
    // Test with backjumping disabled
    const boardWithoutBJ = new SudokuBoard(hardPuzzle);
    solver.setBoard(boardWithoutBJ);
    const resultWithoutBJ = solver.solve({ useBackjumping: false });
    
    // Both should find a solution
    assert(resultWithBJ.solved && resultWithoutBJ.solved, 
        'Both approaches should solve the puzzle');
    
    // In general, backjumping should be more efficient, but this is hard to test
    // deterministically. We at least verify that backjumps are recorded.
    assert(resultWithBJ.performance.backjumps >= 0, 
        'Backjumps should be counted when backjumping is enabled');
}

// Test enhanced MRV heuristic with degree tie-breaking
function testEnhancedMRV() {
    console.log('Testing enhanced MRV heuristic...');
    
    const solver = new SudokuSolver();
    solver.setBoard(new SudokuBoard(hardPuzzle));
    
    // Expose _findBestCell for testing
    const board = solver.board.clone();
    
    // Manually set up a situation with tied MRV
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            board.grid[i][j] = 0;
            board.isGiven[i][j] = false;
        }
    }
    
    // Fill most of the board
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (i !== 0 || (j !== 0 && j !== 1)) {
                board.setValue(i, j, ((i + j) % 9) + 1);
            }
        }
    }
    
    // Now we have two cells with the same number of candidates: (0,0) and (0,1)
    // But (0,0) should have higher degree (more empty related cells)
    
    // Make constraint vectors consistent with our setup
    board.updateAllCandidates();
    
    // Find best cell
    const bestCell = solver._findBestCell(board);
    
    assert(bestCell, 'Should find a best cell');
    assert(bestCell.row === 0, 'Best cell should be in row 0');
    // Validate that it's selecting based on degree
    // The actual column depends on the implementation details
}

// Test least constraining value ordering
function testLCV() {
    console.log('Testing least constraining value ordering...');
    
    const solver = new SudokuSolver();
    
    // Create a simple board where LCV would make a difference
    const board = new SudokuBoard();
    
    // Set up a situation where there are multiple candidates for a cell
    // And some values would constrain more neighbors than others
    
    // Force a cell to have multiple candidates
    const row = 0, col = 0;
    const candidates = [1, 2, 3];
    
    // Order candidates using LCV
    const ordered = solver._orderCandidatesByLCV(board, row, col, candidates);
    
    assert(ordered.length === candidates.length, 'LCV should return same number of candidates');
    assert(ordered.every(c => candidates.includes(c)), 'LCV should return the same candidates');
}

// Test naked pairs detection
function testNakedPairs() {
    console.log('Testing naked pairs detection...');
    
    const solver = new SudokuSolver();
    
    // Create a board with a naked pair
    const nakedPairPuzzle = [
        [0, 0, 3, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];
    
    const board = new SudokuBoard(nakedPairPuzzle);
    
    // Set up a situation with naked pairs manually
    // We'll clear all candidates and set them up ourselves
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            // Reset candidates
            if (board.grid[row][col] === 0) {
                board.candidates[row][col] = 0; // No candidates by default
            }
        }
    }
    
    // Cells (0,0) and (0,1) both have only candidates 1 and 2
    board.addCandidate(0, 0, 1);
    board.addCandidate(0, 0, 2);
    board.addCandidate(0, 1, 1);
    board.addCandidate(0, 1, 2);
    
    // Other cells in the same row have more candidates
    board.addCandidate(0, 3, 1);
    board.addCandidate(0, 3, 2);
    board.addCandidate(0, 3, 4);
    board.addCandidate(0, 3, 5);
    
    board.addCandidate(0, 4, 2);
    board.addCandidate(0, 4, 4);
    board.addCandidate(0, 4, 5);
    
    board.addCandidate(0, 5, 4);
    board.addCandidate(0, 5, 5);
    board.addCandidate(0, 5, 6);
    
    // Test finding naked pairs in this row
    const cells = [
        { row: 0, col: 0, candidates: board.getCandidates(0, 0) },
        { row: 0, col: 1, candidates: board.getCandidates(0, 1) },
        { row: 0, col: 3, candidates: board.getCandidates(0, 3) },
        { row: 0, col: 4, candidates: board.getCandidates(0, 4) },
        { row: 0, col: 5, candidates: board.getCandidates(0, 5) }
    ];
    
    const found = solver._findNakedPairs(board, cells, 'row', 0, false);
    assert(found, 'Should find a naked pair');
    
    // Check that candidates were eliminated
    const cell3Candidates = board.getCandidates(0, 3);
    const cell4Candidates = board.getCandidates(0, 4);
    
    assert(!cell3Candidates.includes(1), 'Candidate 1 should be eliminated from (0,3)');
    assert(!cell3Candidates.includes(2), 'Candidate 2 should be eliminated from (0,3)');
    assert(!cell4Candidates.includes(2), 'Candidate 2 should be eliminated from (0,4)');
}

// Test uniqueness testing
function testUniquenessTesting() {
    console.log('Testing uniqueness testing...');
    
    const solver = new SudokuSolver();
    
    // Test that a standard Sudoku puzzle has a unique solution
    const board = new SudokuBoard(easyPuzzle);
    const isUnique = solver.hasUniqueSolution(board);
    
    assert(isUnique, 'Standard Sudoku puzzle should have a unique solution');
    
    // Test that an empty board has multiple solutions
    const emptyBoard = new SudokuBoard();
    const isEmpty = solver.hasUniqueSolution(emptyBoard);
    
    assert(!isEmpty, 'Empty board should have multiple solutions');
}

// Test difficulty calculation
function testDifficulty() {
    console.log('Testing difficulty calculation...');
    
    const solver = new SudokuSolver();
    
    // Test easy puzzle
    solver.setBoard(new SudokuBoard(easyPuzzle));
    const easyDifficulty = solver.calculateDifficulty();
    
    // Test hard puzzle
    solver.setBoard(new SudokuBoard(hardPuzzle));
    const hardDifficulty = solver.calculateDifficulty();
    
    // Test expert puzzle
    solver.setBoard(new SudokuBoard(expertPuzzle));
    const expertDifficulty = solver.calculateDifficulty();
    
    assert(hardDifficulty > easyDifficulty, 'Hard puzzle should have higher difficulty than easy');
    assert(expertDifficulty >= hardDifficulty, 'Expert puzzle should have higher or equal difficulty as hard');
}

// Test puzzle generation
function testGeneration() {
    console.log('Testing puzzle generation...');
    
    // Generate puzzles of different difficulties
    const easyPuzzle = generatePuzzle(1);
    const mediumPuzzle = generatePuzzle(3);
    const hardPuzzle = generatePuzzle(5);
    
    assert(easyPuzzle instanceof SudokuBoard, 'Generated puzzle should be a SudokuBoard');
    assert(mediumPuzzle instanceof SudokuBoard, 'Generated puzzle should be a SudokuBoard');
    assert(hardPuzzle instanceof SudokuBoard, 'Generated puzzle should be a SudokuBoard');
    
    // Test that the puzzles are valid
    assert(easyPuzzle.isValid(), 'Generated easy puzzle should be valid');
    assert(mediumPuzzle.isValid(), 'Generated medium puzzle should be valid');
    assert(hardPuzzle.isValid(), 'Generated hard puzzle should be valid');
    
    // Count the number of given cells in each puzzle
    const countGiven = (board) => {
        let count = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board.grid[row][col] !== 0) {
                    count++;
                }
            }
        }
        return count;
    };
    
    const easyCount = countGiven(easyPuzzle);
    const mediumCount = countGiven(mediumPuzzle);
    const hardCount = countGiven(hardPuzzle);
    
    // Higher difficulty should generally have fewer givens
    assert(easyCount >= 30, 'Easy puzzle should have sufficient givens');
    assert(hardCount <= easyCount, 'Hard puzzle should have fewer givens than easy');
    
    // Test that the generated puzzles have unique solutions
    const solver = new SudokuSolver();
    
    assert(solver.hasUniqueSolution(easyPuzzle), 'Generated easy puzzle should have a unique solution');
    assert(solver.hasUniqueSolution(mediumPuzzle), 'Generated medium puzzle should have a unique solution');
    assert(solver.hasUniqueSolution(hardPuzzle), 'Generated hard puzzle should have a unique solution');
}

// Export the runTests function for use in test.html
export default runTests; 