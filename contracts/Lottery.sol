//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;


import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./Interfaces/IUniswap.sol";
import "./Interfaces/ISwap.sol";
import "./Interfaces/ICompound.sol";

contract Lottery is Initializable, Ownable {
    uint public fee = 5;
    address[] public usersInGame;
    mapping(address => mapping(address => uint)) public amountOfTokensByUser;
    mapping(address => address[]) public tokensOfUser;
    mapping(address => address) public tokensByCToken;
    address[] public usersInGame;
    IUniswapV2Router Router;


    constructor() {
        Router = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        tokensByCToken[0xdAC17F958D2ee523a2206206994597C13D831ec7] = 0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9;
        tokensByCToken[0x6B175474E89094C44Da98b954EedeAC495271d0F] = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
        tokensByCToken[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = 0x39AA39c021dfbaE8faC545936693aC917d5E7563;
    }



    function supplyErc20ToCompound(
        address _erc20Contract,
        address _cErc20Contract,
        uint256 _numTokensToSupply
    ) public returns (uint) {
        Erc20 underlying = Erc20(_erc20Contract);

        // Create a reference to the corresponding cToken contract, like cDAI
        CErc20 cToken = CErc20(_cErc20Contract);

        // Amount of current exchange rate from cToken to underlying
        uint256 exchangeRateMantissa = cToken.exchangeRateCurrent();

        // Amount added to you supply balance this block
        uint256 supplyRateMantissa = cToken.supplyRatePerBlock();

        // Approve transfer on the ERC20 contract
        underlying.approve(_cErc20Contract, _numTokensToSupply);

        // Mint cTokens
        uint mintResult = cToken.mint(_numTokensToSupply);
        return mintResult;
    }

    function redeemCErc20Tokens(
        uint256 amount,
        bool redeemType,
        address _cErc20Contract
    ) public returns (bool) {
        // Create a reference to the corresponding cToken contract, like cDAI
        CErc20 cToken = CErc20(_cErc20Contract);

        // `amount` is scaled up, see decimal table here:
        // https://compound.finance/docs#protocol-math

        uint256 redeemResult;

        if (redeemType == true) {
            // Retrieve your asset based on a cToken amount
            redeemResult = cToken.redeem(amount);
        } else {
            // Retrieve your asset based on an amount of the asset
            redeemResult = cToken.redeemUnderlying(amount);
        }

        return true;
    }

    function swapFromEther(address memory _tokenOut, address to) public payable {
            address[] memory path = getPathOfEtherAndToken(_tokenOut);       
            Router.swapExactETHForTokens{value: msg.value}(1, path, to, block.timestamp);
        }
    }

    function getPathOfEtherAndToken(address _tokenOut) public view returns(address[] memory){
        address[] memory path = new address[](2);
        path[0] = Router.WETH();
        path[1] = _tokenOut;
        return path;
    }


}
