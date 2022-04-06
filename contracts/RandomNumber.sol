// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@chainlink/contracts/src/v0.7/VRFConsumerBase.sol";
import "./IERC20.sol";
import "./test/VRFCoordinatorMock.sol";
 
contract RandomNumber is VRFConsumerBase {
    
    bytes32 internal keyHash;
    uint256 internal fee;
    uint256 public randomResult;
    bytes32 public lastRequestId;
    Mock mock;

    constructor() 
        VRFConsumerBase(0xf0d54349aDdcf704F77AE15b96510dEA15cb7952, 0x514910771AF9Ca656af840dff83E8264EcF986CA)
    {
        keyHash = 0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445;
        fee = 10 ** 19; // 10 LINK (Varies by network)
        mock = new Mock(0x514910771AF9Ca656af840dff83E8264EcF986CA);
    }
    
    /** 
     * Requests randomness 
     */
    function getRandomNumber() public returns (bytes32) {
        require(IERC20(0x514910771AF9Ca656af840dff83E8264EcF986CA).balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        lastRequestId = requestRandomness(keyHash, fee);
        return lastRequestId;
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        randomResult = randomness + 1;
    }

    function rollDice(uint _maxNumberPossible) public returns(uint) {
        require(randomResult >= 0, "Random result has not been calculated");
        mock.callBackWithRandomness(lastRequestId, 777, address(this));

        return (randomResult % _maxNumberPossible) + 1;
    
    }
    
    /*function getRandomResult() public view returns (uint) {
        return randomResult;
    }*/
}