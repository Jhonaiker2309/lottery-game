//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.6;
import "./Interfaces/IUniswap.sol";

contract Swaps {
IUniswapV2Router Router = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    
    function swapFromEther(address _tokenOut, address to) private payable {
            address[] memory path = getPathOfEtherAndToken(_tokenOut);       
            Router.swapExactETHForTokens{value: msg.value}(1, path, to, block.timestamp);
        }

    function getPathOfEtherAndToken(address _tokenOut) public view returns(address[] memory){
        address[] memory path = new address[](2);
        path[0] = Router.WETH();
        path[1] = _tokenOut;
        return path;
    }
}