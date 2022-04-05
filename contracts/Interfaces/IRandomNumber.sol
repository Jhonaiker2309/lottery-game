// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IRandomNumber {
   function getRandomNumber() external returns (bytes32 requestId);

   function getRandomResult() external view returns (uint randomNumber);
}
