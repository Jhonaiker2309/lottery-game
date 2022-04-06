// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IRandomNumber {
   function getRandomNumber() external returns (bytes32);

   function rollDice(uint maxNumberPossible) external view returns (uint);

   function getRandomResult() external view returns (uint);
}
