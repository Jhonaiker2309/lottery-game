// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IRandomNumber {
   function getRandomNumber() external returns (bytes32);

   function getNumberOfWinner(uint maxNumber) external returns (uint);

   function randomNumber() external view returns (uint);

}
