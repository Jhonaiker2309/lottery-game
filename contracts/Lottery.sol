//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.6;

//Remember to give DAI TO USERS
//Remember give money to winner
// Remember take a commision
//Remember clean the code
//Remember make it work

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./Interfaces/ISwap.sol";
import "./Interfaces/ICompound.sol";
import "./Interfaces/IProvider.sol";
import "./RandomNumber.sol";
import "./Swaps.sol";

//Address Provider Curve 0x0000000022D53366457F9d5E68Ec105046FC4383

//pool 0xC25a3A3b969415c80451098fa907EC722572917F

contract Lottery is Initializable, Ownable, RandomNumber, Swaps {
    uint public FeeOfLottery = 5;
    
    mapping(uint => uint) public amountOfIntervalsByLottery;
    mapping(uint => IntervalsOfTicketsSold[]) public IntervalsByLottery;
    mapping(uint => uint) amountOfSoldTicketsByLottery;
    mapping(uint => mapping(address => bool)) userAlreadyInElection;
    mapping(uint => address[]) usersInLottery;
    mapping(uint => mapping(address => uint)) amountOfTicketsByUserInLottery;

    address public addressProviderCurve = 0x0000000022D53366457F9d5E68Ec105046FC4383;
    address dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address usdt = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address cDai = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    uint currentLottery;


    bool tokensAreInCompound;
    uint startOfCurrentLottery;
    uint timeWhenDaiWasSentToCompound;
    uint cDaiAmount;

    struct IntervalsOfTicketsSold{
        address owner;
        uint minTicket;
        uint maxTicket;
    }

    function startLottery() public onlyOwner {
     // require(block.timestamp >= startOfCurrentLottery + 7 days);
     //Añadir los requires
      require(!(tokensAreInCompound));
      startOfCurrentLottery = block.timestamp;
      currentLottery = currentLottery + 1;
    }


    function sendDaiToCompound () public onlyOwner {
      //require(!(startOfCurrentLottery == 0) && block.timestamp >= startOfCurrentLottery + timeOfRecolection);
      require(!(tokensAreInCompound) && !(startOfCurrentLottery == 0) && (block.timestamp >= startOfCurrentLottery + 2 days));
      uint daiInContract = IERC20Upgradeable(dai).balanceOf(address(this));
      supplyErc20ToCompound(dai, cDai, daiInContract);
      timeWhenDaiWasSentToCompound = block.timestamp;
      tokensAreInCompound = true;
    }

    function receiveDaiFromCompound() public onlyOwner {
      require(tokensAreInCompound && (block.timestamp >= timeWhenDaiWasSentToCompound + 5 days));
      //require(!(startOfCurrentLottery == 0) && block.timestamp > timeWhenDaiWasSentToCompound + 5 days  && tokensAreInCompound);
      redeemCErc20Tokens(cDaiAmount, cDai);
      address[] memory usersInCurrentLotery = usersInLottery[currentLottery];

      for(uint i = 0; i < usersInCurrentLotery.length; i++) {
      IERC20Upgradeable(dai).transfer(usersInCurrentLotery[i], amountOfTicketsByUserInLottery[currentLottery][usersInCurrentLotery[i]]);
      }

      uint prize = IERC20Upgradeable(dai).balanceOf(address(this)) - (amountOfSoldTicketsByLottery[currentLottery + 1] * (10 ** 18));

      uint feeToOwner = (prize * FeeOfLottery) / 100;
      prize = prize - feeToOwner;

      IERC20Upgradeable(dai).transfer(owner(), feeToOwner);

      getRandomNumber();

      uint winner = (randomResult % amountOfSoldTicketsByLottery[currentLottery]) + 1;

      address addressOfWinner = getAddressOfWinner(winner);

      IERC20Upgradeable(dai).transfer(addressOfWinner, prize);

      tokensAreInCompound = false;
    }

    function getAddressOfWinner(uint numberOfWinner) public returns(address){
        address winner;
        IntervalsOfTicketsSold[] memory IntervalsInCurrentElection = IntervalsByLottery[currentLottery];
        for(uint i = 0; i < amountOfIntervalsByLottery[currentLottery]; i++){
            
            if(IntervalsInCurrentElection[i].minTicket <= numberOfWinner && IntervalsInCurrentElection[i].maxTicket >= numberOfWinner){
                winner = IntervalsInCurrentElection[i].owner;
                break;
            }
        }
    
        return winner;
    }

    function buyTicketsWithEth() public payable {
        swapFromEther{value: msg.value}(dai, address(this));

        uint amountOfDai = IERC20Upgradeable(dai).balanceOf(address(this));

        require(amountOfDai >= 10 ** 18, "You have to buy at least 1 ticket");

        uint difference = amountOfDai % (10 ** 18); 
        
        if(!(difference == 0)) {
            IERC20Upgradeable(dai).transfer(msg.sender, difference);
            amountOfDai = amountOfDai - difference;
        }

        uint tickets = amountOfDai / 10 ** 18;

        uint initialTicket;

        if(amountOfSoldTicketsByLottery[currentLottery] == 0){
            initialTicket = 1;
        } else {
            initialTicket = amountOfSoldTicketsByLottery[currentLottery] + 1;
        }

        IntervalsByLottery[currentLottery].push(IntervalsOfTicketsSold(msg.sender, initialTicket, initialTicket + tickets -1));
        amountOfIntervalsByLottery[currentLottery] = amountOfIntervalsByLottery[currentLottery] + 1;
        amountOfSoldTicketsByLottery[currentLottery] = amountOfSoldTicketsByLottery[currentLottery] + tickets;

        if(!userAlreadyInElection[currentLottery][msg.sender]) {
            userAlreadyInElection[currentLottery][msg.sender] = true;
            usersInLottery[currentLottery].push(msg.sender);
        }

        amountOfTicketsByUserInLottery[currentLottery][msg.sender] = amountOfTicketsByUserInLottery[currentLottery][msg.sender] + tickets;

    }

    function buyTicketsWithToken(IERC20Upgradeable _token, uint _amount) public {
        require(address(_token) == dai || address(_token) == usdt || address(_token) == usdc);
        _token.transferFrom(msg.sender,address(this), _amount );

        if(!(address(_token) == dai)) {
           uint balanceOfToken = _token.balanceOf(address(this));
           exchangesTokensOnCurve(0xC25a3A3b969415c80451098fa907EC722572917F, address(_token) ,dai, balanceOfToken,1, address(this));
        } 

        uint amountOfDai = IERC20Upgradeable(dai).balanceOf(address(this));

        require(amountOfDai >= 10 ** 18, "You have to buy at least 1 ticket");

        uint difference = amountOfDai % (10 ** 18); 
        
        if(!(difference == 0)) {
            IERC20Upgradeable(dai).transfer(msg.sender, difference);
            amountOfDai = amountOfDai - difference;
        }

        uint tickets = amountOfDai / 10 ** 18;
        uint initialTicket;
        if(amountOfSoldTicketsByLottery[currentLottery] == 0){
            initialTicket = 1;
        } else {
            initialTicket = amountOfSoldTicketsByLottery[currentLottery] + 1;
        }

        IntervalsByLottery[currentLottery].push(IntervalsOfTicketsSold(msg.sender, initialTicket, initialTicket + tickets -1));
        amountOfIntervalsByLottery[currentLottery] = amountOfIntervalsByLottery[currentLottery] + 1;
        amountOfSoldTicketsByLottery[currentLottery] = amountOfSoldTicketsByLottery[currentLottery] + tickets;

        if(!userAlreadyInElection[currentLottery][msg.sender]) {
            userAlreadyInElection[currentLottery][msg.sender] = true;
            usersInLottery[currentLottery].push(msg.sender);
        }

        amountOfTicketsByUserInLottery[currentLottery][msg.sender] = amountOfTicketsByUserInLottery[currentLottery][msg.sender] + tickets;
    }



    function supplyErc20ToCompound(
        address _erc20Contract,
        address _cErc20Contract,
        uint256 _numTokensToSupply
    ) public returns (uint) {
        IERC20Upgradeable tokenToSendToCompound = IERC20Upgradeable(_erc20Contract);

        // Create a reference to the corresponding cToken contract, like cDAI
        CErc20 cToken = CErc20(_cErc20Contract);
        // Approve transfer on the ERC20 contract
        tokenToSendToCompound.approve(_cErc20Contract, _numTokensToSupply);

        // Mint cTokens
        uint mintResult = cToken.mint(_numTokensToSupply);
        return mintResult;
    }

    function redeemCErc20Tokens(
        uint256 amount,
        address _cErc20Contract
    ) public returns (bool) {
        // Create a reference to the corresponding cToken contract, like cDAI
        CErc20 cToken = CErc20(_cErc20Contract);  

        uint256 redeemResult;

        redeemResult = cToken.redeem(amount);
        return true;
    }

        function exchangesTokensOnCurve(
        address _pool,
        address _from,
        address _to,
        uint256 _amount,
        uint256 _expected,
        address _receiver
    ) internal {
        address exchangeContract = returnsExchangeAddress(2);
        IERC20Upgradeable(_from).approve(exchangeContract, _amount);

        ISwap(exchangeContract).exchange(
            _pool,
            _from,
            _to,
            _amount,
            _expected,
            _receiver
        );
    }    

        function returnsExchangeAddress(uint256 _id)
        internal
        view
        returns (address)
    {
        return IProvider(addressProviderCurve).get_address(_id);
    }

}

