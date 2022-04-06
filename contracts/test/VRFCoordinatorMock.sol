// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@chainlink/contracts/src/v0.7/tests/VRFCoordinatorMock.sol";

contract Mock is VRFCoordinatorMock {
    constructor(address _link) public
    VRFCoordinatorMock(_link) {}
}
 