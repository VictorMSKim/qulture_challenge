import React from 'react';
import './Board.css';
import Square from '../Square/Square';
import {initialBoardState, light, dark, highlight, columns, rows} from '../../utils/constants';
import {removeDuplicates, isPresentInArray, checkIfInteger, calculateDelta} from '../../utils/utils';

class Board extends React.Component {
    constructor() {
        super();
        this.state = {
            boardState: initialBoardState,
            redPaths: [[3, 0], [3, 2], [3, 4], [3, 6]],
            blackPaths: [[4, 1], [4, 3], [4, 5], [4, 7]],
            enemy: [],
            selectedRedPiece: [],
            selectedBlackPiece: [],
            isolatedRedPath: [],
            isolatedBlackPath: [],
            turn: 'b',
        }
        this.updateBoardState = this.updateBoardState.bind(this)
        this.pieceClickHandler = this.pieceClickHandler.bind(this)
        this.showPossiblePaths = this.showPossiblePaths.bind(this)
        this.renderSquares = this.renderSquares.bind(this)
    }

    updateBoardState(newPieceX, newPieceY) {
        const { boardState, selectedRedPiece, selectedBlackPiece, enemy, isolatedRedPath, isolatedBlackPath, turn } = this.state
        let newBoardState = boardState
        this.cleanBoardHighlight(newBoardState);
        this.movePiece(turn === 'r' ? selectedRedPiece : selectedBlackPiece, newPieceX, newPieceY, 
                        newBoardState, enemy, turn === 'r' ? isolatedRedPath : isolatedBlackPath);
        this.setState({boardState: newBoardState, selectedRedPiece: [], selectedBlackPiece: []})
    }

    identifyEnemyPiece(pieceType, movesArray, board) {
        const enemy = [];
        const enemyPiece = pieceType === 'r' ? 'b' : 'r';
        for(let i = 0; i < movesArray.length; i++) {
            if(board[movesArray[i][0]][movesArray[i][1]] === enemyPiece)
                enemy.push(movesArray[i])
        }
        return enemy;
    }

    canJumpOver(pieceType, movesArray, board, pieceY, pieceX) {
        const enemy = this.identifyEnemyPiece(pieceType, movesArray, board);
        const jump = []
        if(enemy.length) {
            for(let i = 0; i < enemy.length; i++) {
                const enemyX = enemy[i][0];
                const enemyY = enemy[i][1];
                const delta = calculateDelta(enemyX, enemyY, pieceX, pieceY)
                const freeSpace = [enemyX + delta[0], enemyY + delta[1]]
                if(!this.isOutsideOfBoard(freeSpace) && board[freeSpace[0]][freeSpace[1]] === '-') {
                    jump.push(freeSpace)
                }
            }
        }
        this.setState({enemy: enemy})
        return jump
    }

    enemyPosToRemove(oldPosX, oldPosY, newPosX, newPosY) {
        const delta = calculateDelta(oldPosX, oldPosY, newPosX, newPosY)
        const deltaX = delta[0] / 2;
        const deltaY = delta[1] / 2;
        const enemyPos = [newPosX + deltaX, newPosY + deltaY]
        return enemyPos
    }

    turnPieceIntoKing(selectedPiece) {
        
    }

    movePiece(selectedPiece, newPieceX, newPieceY, board, enemy, isolatedMoves) {
        if(selectedPiece.length && this.isMoveLegal([newPieceX, newPieceY], isolatedMoves)) {
            const pieceType = board[selectedPiece[0]][selectedPiece[1]] === 'r' ? 'r' : 'b';
            const enemyPos = this.enemyPosToRemove(selectedPiece[0], selectedPiece[1], newPieceX, newPieceY, isolatedMoves)
            if(enemy.length && checkIfInteger(enemyPos[0]) && checkIfInteger(enemyPos[1])) {
                board[enemyPos[0]][enemyPos[1]] = '-'
            }
            board[newPieceX][newPieceY] = pieceType;
            board[selectedPiece[0]][selectedPiece[1]] = '-'
            this.switchTurn();
        }
    }

    switchTurn() {
        const {turn} = this.state
        this.setState({
            turn: turn === 'b' ? 'r' : 'b'
        })
    }

    isMoveLegal(move, allowedMovesArray) {
        return isPresentInArray(allowedMovesArray, move);
    }

    includeInArray(path, pieceX, pieceY, movesArray) {
        if(isPresentInArray(path, [pieceX, pieceY + 1])) 
            movesArray.push([pieceX, pieceY + 1])
        if(isPresentInArray(path, [pieceX, pieceY - 1])) 
            movesArray.push([pieceX, pieceY - 1])        
    }

    isolatePieceMoves(selectedPiece, piecePaths, board, isKing) {
        const moves = [];
        let jump = [];
        let pieceType;
        let pieceX;
        let pieceXifKing;
        if (selectedPiece.length) {
            pieceType = board[selectedPiece[0]][selectedPiece[1]] === 'r' ? 'r' : 'b';
            pieceX = pieceType === 'r' ? selectedPiece[0] + 1 : selectedPiece[0] - 1;
            this.includeInArray(piecePaths, pieceX, selectedPiece[1], moves);
            if(pieceType === 'r' && isKing) {
                pieceXifKing = selectedPiece[0] - 1;
                this.includeInArray(piecePaths, pieceXifKing, selectedPiece[1], moves);
            }
            if(pieceType === 'b' && isKing) {
                pieceXifKing = selectedPiece[0] + 1;
                this.includeInArray(piecePaths, pieceXifKing, selectedPiece[1], moves);
            }
            jump = this.canJumpOver(pieceType, moves, board, selectedPiece[1], selectedPiece[0]);
        }
        if(jump.length) return jump;
        return moves;
    }

    showPossiblePaths(board, isKing) {
        let possibleRedPaths = [];
        let possibleBlackPaths = [];
        this.findAllMoves(board, possibleRedPaths, possibleBlackPaths, isKing);
        possibleBlackPaths = removeDuplicates(possibleBlackPaths)
        possibleRedPaths = removeDuplicates(possibleRedPaths)
        this.removeInvalidMovements(possibleRedPaths)
        this.removeInvalidMovements(possibleBlackPaths)
        this.setState({redPaths: possibleRedPaths, blackPaths: possibleBlackPaths})
        return [possibleRedPaths, possibleBlackPaths]
    }

    findAllMoves(board, possibleRedPaths, possibleBlackPaths, isKing) {
        for (let i = 0; i < columns; i++) {
            for (let j = 0; j < rows; j++) {
                if(board[j][i] === 'r') {
                    possibleRedPaths.push([j + 1, i + 1], [j + 1, i - 1])
                    if(isKing) possibleRedPaths.push([j - 1, i + 1], [j - 1, i - 1])
                }
                if(board[j][i] === 'b') {
                    possibleBlackPaths.push([j - 1, i + 1], [j - 1, i - 1])
                    if(isKing) possibleBlackPaths.push([j + 1, i + 1], [j + 1, i - 1])
                }
            }
        }
    }

    isOutsideOfBoard(positionsArray) {
        return positionsArray[0] > 7 || positionsArray[0] < 0 || positionsArray[1] < 0 || positionsArray[1] > 7
    }

    removeInvalidMovements(movementsArray) {
        for (let i = 0; i < movementsArray.length; i++) {
            if (this.isOutsideOfBoard(movementsArray[i])) {
                movementsArray.splice(i, 1)
                i--;
            }
        }
    }

    cleanBoardHighlight(highlightedBoard) {
        for(let i = 0; i < rows; i++)
            for(let j = 0; j < columns; j++)
                if(highlightedBoard[j][i] === 'h') highlightedBoard[j][i] = '-'  
    }

    highlightBoard(squarePosition, board) {
        for(let i = 0; i < squarePosition.length; i++) {
            if(board[squarePosition[i][0]][squarePosition[i][1]] === 'h') board[squarePosition[i][0]][squarePosition[i][1]] = '-'
            else if(board[squarePosition[i][0]][squarePosition[i][1]] === '-') board[squarePosition[i][0]][squarePosition[i][1]] = 'h'  
        }
    }

    calculatePieceMoves(path, board, selectedPiece, pieceType, isKing) {
        const possiblePaths = this.showPossiblePaths(board, isKing);
        path = pieceType === 'r' ? possiblePaths[0] : possiblePaths[1];
        path = this.isolatePieceMoves(selectedPiece, path, board, isKing)
        this.highlightBoard(path, board)
        this.setState({
            boardState: board, 
            selectedRedPiece: pieceType === 'r' ? selectedPiece : [], 
            selectedBlackPiece: pieceType === 'r' ? [] : selectedPiece, 
            isolatedRedPath: pieceType === 'r' ? path : [], 
            isolatedBlackPath: pieceType === 'r' ? [] : path
        })
    }

    pieceClickHandler(pieceX, pieceY, pieceType, isKing) {
        const {boardState, turn} = this.state
        let redPath = [];
        let blackPath = [];
        const path = pieceType === 'r' ? redPath : blackPath;
        let highlightBoard = boardState
        let selectedPiece = [pieceX, pieceY]
        this.cleanBoardHighlight(highlightBoard)
        if(pieceType === turn) {
            this.calculatePieceMoves(path, highlightBoard, selectedPiece, pieceType, isKing)
        }
    }

    endGame() {
        const {redPaths, blackPaths} = this.state
        return !redPaths.length || !blackPaths.length 
    }

    renderSquares() {
        const { boardState } = this.state
        const divs = [];
        let columnsToRender = [];
        let squareColor = light;
        let freeSquare = false;
        for(let i = 0; i < initialBoardState.length; i++) {
            for(let j = 0; j < initialBoardState.length; j++) {
                if ((i % 2 === 0 && j % 2 === 1) || (i % 2 === 1 && j % 2 === 0)) squareColor = dark;
                else squareColor = light;
                if (boardState[j][i] === 'h') squareColor = highlight
                freeSquare = (boardState[j][i] === 'h' || boardState[j][i] === '-') && (squareColor === dark || squareColor === highlight);
                columnsToRender.push(
                    <Square 
                        className={squareColor} piece={boardState[j][i]} key={7 * i + j} isfree={freeSquare} 
                        x={j} y={i} movePiece={this.updateBoardState} pieceClickHandler={this.pieceClickHandler} 
                        isKing={this.turnPieceIntoKing(j, boardState[j][i])} 
                    />
                )
            }
            divs.push(columnsToRender)
            columnsToRender = []
        }
        return divs;
    }

    render() {
        const { redPaths, turn } = this.state;
        return (
            <div className="board">
                <div><p>TURN {turn === 'r' ? 'RED' : 'BLACK'}</p></div>
                {this.endGame() ? 
                    (<div>
                        <p>
                            {redPaths.length === 0 ? "BLACK WINS":"RED WINS"}
                        </p>
                    </div>) : 
                    this.renderSquares().map((elem, index) => 
                        <div key={index}>
                            {elem}
                        </div>)
                }
            </div>
        );
    }
}

export default Board;
