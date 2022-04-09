// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@chainlink/contracts/src/v0.7/VRFConsumerBase.sol";
import "./Interfaces/IERC20.sol";
import "./test/VRFCoordinatorMock.sol";
 
contract RandomNumber is VRFConsumerBase {
    
    bytes32 internal keyHash;
    uint256 internal fee;
    uint256 public randomNumber;
    bytes32 public lastRequestId;
    address vrfCoordinator;

    constructor(address _vrfCoordinator) 
        VRFConsumerBase(_vrfCoordinator, 0x514910771AF9Ca656af840dff83E8264EcF986CA)
    {
        vrfCoordinator = _vrfCoordinator;
        keyHash = 0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445;
        fee = 10 ** 19; // 10 LINK (Varies by network)
    }
    
    /** 
     * Requests randomness 
     */
    function getRandomNumber() public returns (bytes32) {
        require(IERC20(0x514910771AF9Ca656af840dff83E8264EcF986CA).balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        lastRequestId = requestRandomness(keyHash, fee);
        Mock(vrfCoordinator).callBackWithRandomness(lastRequestId, 900, address(this));
        return lastRequestId;
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        randomNumber = randomness;
    }
}