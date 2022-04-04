// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IProvider {
    function get_address(uint256 _id) external view returns (address);
}