//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.6;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "./Interfaces/IUniswap.sol";
import "./Interfaces/ISwap.sol";
import "./Interfaces/ICompound.sol";
import "./Interfaces/IProvider.sol";
import "./Interfaces/IRandomNumber.sol";

contract Lottery is Initializable {
        
    // Owner of the contract
    address public owner;

    // Amount of Intervals that each lottery has
    mapping(uint => uint) public amountOfIntervalsByLottery;
    // Array of Intervals that each lottery has
    mapping(uint => IntervalOfTicketsSold[]) public IntervalsByLottery;
    // Amount of tickets that has been sold in each lottery
    mapping(uint => uint) public amountOfSoldTicketsByLottery;
    // Check if an user is already a participant of the lottery
    mapping(uint => mapping(address => bool)) public userAlreadyInLottery;
    // Array of users that are in each lottery
    mapping(uint => address[]) public usersInLottery;
    //Amount of tickets that each user has in each lottery
    mapping(uint => mapping(address => uint)) public amountOfTicketsByUserInLottery;
    // Amount of CDai that each lottery has
    mapping(uint => uint) public amountOfCdaiByLottery;
    //Address of user that won each lottery
    mapping(uint => address) public winnerByLottery;

    // Address of the exchange curve
    address public addressProviderCurve;

    // Number that won the last lottery
    uint public numberWinnerOfLastLottery;
    // Number of Current Lottery
    uint public currentLottery;

    // Address of Dai
    address public dai;
    //Address of Usdc
    address public usdc;
    //Address of Usdt
    address public usdt;
    //Address of cDai, the token that compound gives you for Dai
    address public cDai;



    // Bool that says if the current Lottery is still selling tickets
    bool public tokenReceptionIsActive;
    // Bools that say in Dai is in compound
    bool public tokensAreInCompound;

    // timestamp when the current lottery started
    uint public startOfCurrentLottery;
    // timestamp when the Dai was sent to Compound
    uint public timeWhenDaiWasSentToCompound;
    // Percentage of prize that will be for the owner of the contract
    uint public FeeOfLottery;

    // Interface to Interact with uniswap
    IUniswapV2Router Router;
    // Interface to interat with chainlink random numbers
    IRandomNumber randomNumberCaller;


    // Struct with the owner and interval of tickets sold
    struct IntervalOfTicketsSold{
        address owner;
        uint minTicket;
        uint maxTicket;
    }


    /// @notice Constructor of upgradeable function
    /// @param _randomNumberContractAddress Address of contracts that gets a random number for chainlink
    /// @dev  Sets multiple values
    function initialize(address _randomNumberContractAddress)  external initializer {
        Router = IUniswapV2Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        owner = payable(msg.sender);
        addressProviderCurve = 0x0000000022D53366457F9d5E68Ec105046FC4383;
        dai = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
        usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        usdt = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
        cDai = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
        FeeOfLottery = 5;
        randomNumberCaller = IRandomNumber(_randomNumberContractAddress);
    }


    /// @notice Start a new lottery
    /// @dev  sets startOfCurrentLottery with the current timestamp, add 1 to currentLottery and start money collection for current lottery

    function startLottery() public onlyOwner {
      require(!(tokensAreInCompound) && !(tokenReceptionIsActive), "You can't start a lottery when other is active");
      startOfCurrentLottery = block.timestamp;
      currentLottery = currentLottery + 1;
      tokenReceptionIsActive = true;
    }


    /// @notice Send Dai uin current Lottery to compound to gain interest rate    
    /// @dev  Get dai in current lottery, send it to Compound with the function supplyErc20ToCompound, set the amount of CDai for current Lottery and set variables that control what happens with the tickets that users will buy after this
    function sendDaiToCompound() public onlyOwner {
      require(amountOfSoldTicketsByLottery[currentLottery] > 0, "The lottery hasn't sold tickets");
      require(!(tokensAreInCompound), "Tokens are already in compound");
      require(!(startOfCurrentLottery == 0), "None lottery has been started");
      require(block.timestamp >= startOfCurrentLottery + 2 days, "You have to wait 2 days after the start of the lottery");
      uint daiInContract = IERC20Upgradeable(dai).balanceOf(address(this));
      daiInContract = daiInContract - (amountOfSoldTicketsByLottery[currentLottery + 1] * 10 ** 18);
      supplyErc20ToCompound(dai, cDai, daiInContract);
      amountOfCdaiByLottery[currentLottery] = getCTokenDaiBalance();
      timeWhenDaiWasSentToCompound = block.timestamp;
      tokensAreInCompound = true;
      tokenReceptionIsActive = false;
    }


    /// @notice Reveive Dai from Compound, give the dai to the buyers and get a winner
    /// @dev  get dai from compound, transfer to users, get a winner with chainlink random number, give him the prize and taka a fee for the owner
        function receiveDaiFromCompound() public onlyOwner {
      require(tokensAreInCompound, "Tokens are not in compound");
      require(block.timestamp >= timeWhenDaiWasSentToCompound + 5 days, "You have to wait 5 days to receive tokens from compound");
      
      redeemCErc20Tokens(amountOfCdaiByLottery[currentLottery], cDai);
      address[] memory usersInCurrentLotery = usersInLottery[currentLottery];

      for(uint i = 0; i < usersInCurrentLotery.length; i++) {
      IERC20Upgradeable(dai).transfer(usersInCurrentLotery[i], amountOfTicketsByUserInLottery[currentLottery][usersInCurrentLotery[i]] * (10 ** 18));
      }

      uint prize = IERC20Upgradeable(dai).balanceOf(address(this)) - (amountOfSoldTicketsByLottery[currentLottery + 1] * (10 **18)); //- (amountOfSoldTicketsByLottery[currentLottery + 1] * (10 ** 18));

      uint feeToOwner = (prize * FeeOfLottery) / 100;
      prize = prize - feeToOwner;

      IERC20Upgradeable(dai).transfer(owner, feeToOwner);

      uint winner = getNumberOfWinner(amountOfSoldTicketsByLottery[currentLottery]);

      address addressOfWinner = getAddressOfWinner(winner);

      IERC20Upgradeable(dai).transfer(addressOfWinner, prize);

      winnerByLottery[currentLottery] = addressOfWinner;

      tokensAreInCompound = false;
    }

    /// @notice Buy dai with ether and buy tickets with it 
    /// @dev  Buy dai with ether using Uniswap, buy tickets for the lottery, if the bought of tickets isn't avaible you will buy tickets for te next one
    function buyTicketsWithEth() public payable {
        require(startOfCurrentLottery > 0, "None lottery has been started");
            address[] memory path = getPathOfEtherAndToken(dai);       
            uint[] memory results;
            results = Router.swapExactETHForTokens{value: msg.value}(1, path, address(this), block.timestamp);

        uint amountOfDai = results[1];

        if(amountOfDai < 10 ** 18) {
            IERC20Upgradeable(dai).transfer(msg.sender, amountOfDai);
        }  else {

        uint difference = amountOfDai % (10 ** 18); 
        
        if(!(difference == 0)) {
            IERC20Upgradeable(dai).transfer(msg.sender, difference);
            amountOfDai = amountOfDai - difference;
        }

        uint tickets = amountOfDai / 10 ** 18;

        uint initialTicket;

        uint lotteryFromWhereUserWillBuyTickets;

        if(tokenReceptionIsActive) {
            lotteryFromWhereUserWillBuyTickets = currentLottery;
        } else {
            lotteryFromWhereUserWillBuyTickets = currentLottery + 1;
        }

        if(amountOfSoldTicketsByLottery[lotteryFromWhereUserWillBuyTickets] == 0){
            initialTicket = 1;
        } else {
            initialTicket = amountOfSoldTicketsByLottery[lotteryFromWhereUserWillBuyTickets] + 1;
        }

        IntervalsByLottery[lotteryFromWhereUserWillBuyTickets].push(IntervalOfTicketsSold(msg.sender, initialTicket, initialTicket + tickets -1));
        amountOfIntervalsByLottery[lotteryFromWhereUserWillBuyTickets] = amountOfIntervalsByLottery[lotteryFromWhereUserWillBuyTickets] + 1;
        amountOfSoldTicketsByLottery[lotteryFromWhereUserWillBuyTickets] = amountOfSoldTicketsByLottery[lotteryFromWhereUserWillBuyTickets] + tickets;

        if(!userAlreadyInLottery[lotteryFromWhereUserWillBuyTickets][msg.sender]) {
            userAlreadyInLottery[lotteryFromWhereUserWillBuyTickets][msg.sender] = true;
            usersInLottery[lotteryFromWhereUserWillBuyTickets].push(msg.sender);
        }

        amountOfTicketsByUserInLottery[lotteryFromWhereUserWillBuyTickets][msg.sender] = amountOfTicketsByUserInLottery[lotteryFromWhereUserWillBuyTickets][msg.sender] + tickets;
        }
    }

    /// @notice Buy lottery tickets with stablecoins
    /// @param _tokenErc20 Addres of the erc20 tokens that we will use to pay
    /// @param _amount Amount of erc20 tokens that we will use to pay
    /// @dev  In case that the stablecoin is not Dai, swap the stablecoin for in using curve. After that buy tickets using Dai

    function buyTicketsWithTokens(address _tokenErc20, uint _amount) public {
        require(startOfCurrentLottery > 0, "None lottery has been started");
        IERC20Upgradeable _token =  IERC20Upgradeable(_tokenErc20);
        uint amountOfDai = _amount;
         
        require(address(_token) == dai || address(_token) == usdt || address(_token) == usdc, "Token no valid");
        
        _token.transferFrom(msg.sender, address(this), _amount);

        if(!(address(_token) == dai)) {
           uint balanceOfToken = _token.balanceOf(address(this));
                      
           amountOfDai = exchangesTokensOnCurve(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7, address(_token) ,dai, balanceOfToken,1, address(this));
        } 

        if(amountOfDai < 10 ** 18) {
            IERC20Upgradeable(dai).transfer(msg.sender, amountOfDai);
        } else {

        uint difference = amountOfDai % (10 ** 18); 
        
        if(!(difference == 0)) {
            IERC20Upgradeable(dai).transfer(msg.sender, difference);
            amountOfDai = amountOfDai - difference;
        }

        uint tickets = amountOfDai / 10 ** 18;
        uint initialTicket;

        uint lotteryFromWhereUserWillBuyTickets;

        if(tokenReceptionIsActive) {
            lotteryFromWhereUserWillBuyTickets = currentLottery;
        } else {
            lotteryFromWhereUserWillBuyTickets = currentLottery + 1;
        }

        if(amountOfSoldTicketsByLottery[currentLottery] == 0){
            initialTicket = 1;
        } else {
            initialTicket = amountOfSoldTicketsByLottery[currentLottery] + 1;
        }

        IntervalsByLottery[lotteryFromWhereUserWillBuyTickets].push(IntervalOfTicketsSold(msg.sender, initialTicket, initialTicket + tickets -1));
        amountOfIntervalsByLottery[lotteryFromWhereUserWillBuyTickets] = amountOfIntervalsByLottery[lotteryFromWhereUserWillBuyTickets] + 1;
        amountOfSoldTicketsByLottery[lotteryFromWhereUserWillBuyTickets] = amountOfSoldTicketsByLottery[lotteryFromWhereUserWillBuyTickets] + tickets;

        if(!userAlreadyInLottery[lotteryFromWhereUserWillBuyTickets][msg.sender]) {
            userAlreadyInLottery[lotteryFromWhereUserWillBuyTickets][msg.sender] = true;
            usersInLottery[lotteryFromWhereUserWillBuyTickets].push(msg.sender);
        }

        amountOfTicketsByUserInLottery[lotteryFromWhereUserWillBuyTickets][msg.sender] = amountOfTicketsByUserInLottery[lotteryFromWhereUserWillBuyTickets][msg.sender] + tickets;
        }
    }


    /// @notice Send erc20 tokens to compound
    /// @param _erc20Contract Addres of the contract of the ERC20 Token
    /// @param _cErc20Contract Address of the contract of the cERC20 Token
    /// @param _numTokensToSupply Amount of tokens that will be added to the Compound
    /// @dev  Mint cErc20 tokens from compound
    function supplyErc20ToCompound(
        address _erc20Contract,
        address _cErc20Contract,
        uint256 _numTokensToSupply
    ) private returns (uint) {
        IERC20Upgradeable tokenToSentToCompound = IERC20Upgradeable(_erc20Contract);

        // Create a reference to the corresponding cToken contract, like cDAI
        CErc20 cToken = CErc20(_cErc20Contract);
        // Approve transfer on the ERC20 contract
        tokenToSentToCompound.approve(_cErc20Contract, _numTokensToSupply);

        // Mint cTokens
        uint mintResult = cToken.mint(_numTokensToSupply);
        require(mintResult == 0, "Mint results must be 0");
        return mintResult;
    }



    /// @notice Get Tokens from compound
    /// @param amount Amount of cErc20 tokens that we will exchange por Erc20 tokens from compound
    /// @param _cErc20Contract Id of the cErc20 token that we want to change for Erc20 tokens in Compound
    /// @dev  Change cErc20 tokens for Erc20 tokens in compound

    // This function should be private, I made it public to test it
    function redeemCErc20Tokens(
        uint256 amount,
        address _cErc20Contract
    ) public returns (bool) {
        // Create a reference to the corresponding cToken contract, like cDAI
        CErc20 cToken = CErc20(_cErc20Contract);  

        uint256 redeemResult;

        redeemResult = cToken.redeem(amount);
        require(redeemResult == 0, "redeemResult must be 0");
        return true;
    }


    /// @notice Exchange a token for other in the exchange Curve
    /// @param _pool Address of pool from where user will swap his tokens
    /// @param _from Address of token that the user will swap for other
    /// @param _to Address of token that the user will get for his original token
    /// @param _amount Amount of tokens that the user will swap
    /// @param _expected Amount of tokens that whe user expects to get for his tokens
    /// @param _receiver Address that will get the tokens that the user got for the swap
    /// @dev  Exchange a token for other using the interface of Curve
        function exchangesTokensOnCurve(
        address _pool,
        address _from,
        address _to,
        uint256 _amount,
        uint256 _expected,
        address _receiver
    ) internal returns(uint){
        address exchangeContract = returnsExchangeAddress(2);
        IERC20Upgradeable(_from).approve(exchangeContract, _amount);

        return ISwap(exchangeContract).exchange(
            _pool,
            _from,
            _to,
            _amount,
            _expected,
            _receiver
        );
    }    

    /// @notice Get winner number of lottery
    /// @param maxNumber highest possible value of winner number
    /// @dev  The function calls a random number from chainlink, gets the remainder of that number with maxNumber and adds 1 to that result
    function getNumberOfWinner(uint maxNumber) public onlyOwner returns (uint){
        randomNumberCaller.getRandomNumber();

        uint randomNumber = randomNumberCaller.randomNumber();

        uint result = (randomNumber % maxNumber) + 1;

        numberWinnerOfLastLottery = result;

        return result;
    }

    /// @notice Get address of winner of the lottery
    /// @param numberOfWinner Number of ticket that won the prize
    /// @dev  Do a for loop in IntervalsByLottery[currentLottery] to get the owner of the interval of tickets that contains the winner ticket
    function getAddressOfWinner(uint numberOfWinner) private view returns(address){
        address winner;
        IntervalOfTicketsSold[] memory IntervalsInCurrentElection = IntervalsByLottery[currentLottery];
        for(uint i = 0; i < amountOfIntervalsByLottery[currentLottery]; i++){
            
            if(IntervalsInCurrentElection[i].minTicket <= numberOfWinner && IntervalsInCurrentElection[i].maxTicket >= numberOfWinner){
                winner = IntervalsInCurrentElection[i].owner;
                break;
            }
        }
    
        return winner;
    }

    /// @notice Get Balance of cDai in the contract
    /// @dev  Calls the BalanceOf function of the interface CErc20 with the address of the contract

    function getCTokenDaiBalance() public view returns (uint) {
        return CErc20(cDai).balanceOf(address(this));
    }    


    /// @notice Get an address using the interface IProvider
    /// @param _id Id of the IProvider address that the user wants to get
    /// @dev  Use the interface IProvider to get an address of the exchange of Curve
    function returnsExchangeAddress(uint256 _id)
        internal
        view
        returns (address)
    {
        return IProvider(addressProviderCurve).get_address(_id);
    }


    /// @notice Create a array of addresses that uniswap will use to make a swap of ether for a token
    /// @param _tokenOut Address of the token that the user wants to get after swap his ether
    /// @dev  Create an array of 2 addresses. The address of Weth and the address of _tokenOut
    function getPathOfEtherAndToken(address _tokenOut) private view returns(address[] memory){
        address[] memory path = new address[](2);
        path[0] = Router.WETH();
        path[1] = _tokenOut;
        return path;
    }

    /// @notice Send ether to an address
    /// @param _to Addres to where the user will send his ether
    /// @dev  transfer ether to the address _to

    function sendEth(address payable _to) public payable {
        _to.transfer(msg.value);
    }

    /// @notice Modifier that only allows the owner of the contract to use the function where it's used   
    /// @dev Checks if msg.sender is equal to owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

}

