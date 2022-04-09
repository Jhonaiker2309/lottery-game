const { expect } = require("chai");
const { ethers} = require( "hardhat" );
const { daiABI, usdtABI, usdcABI, linkABI } = require("../abis/abis.json");
const {toWei, fromWei, toDays, increaseTime, increaseBlocks} = require("./utils");

describe("Market contract", function () {

    let etherscanAddressWithDai, etherscanAddressWithUsdt, etherscanAddressWithUsdc, etherscanAddressWithLink
    let Lottery, lottery, RandomNumber, randomNumber, Mock, mock
    let link, usdt, dai, usdc
    let owner, account1, account2, accountWithDai, accountWithUsdt, accountWithUsdc, accountWithLink;

    etherscanAddressWithDai = "0x1821Eb432E091Cce0f2Aa13BD64399A474D325d0";
    etherscanAddressWithUsdt = "0x68B12741094702B016bcFd81d69E847d132E0618";
    etherscanAddressWithUsdc = "0x053A749Ec24CE3Eabe5F34aE1DCfB4952DCFD935";
    etherscanAddressWithLink = "0xa037D8b538096889a1a6908956147bd0f6D0C49c";

    beforeEach(async function () {
        Lottery = await ethers.getContractFactory("Lottery");
        RandomNumber = await ethers.getContractFactory("RandomNumber");
        Mock = await ethers.getContractFactory("Mock");
        [owner, account1, account2] = await ethers.getSigners();
    
        await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [etherscanAddressWithDai]
		});

        accountWithDai = await ethers.getSigner(etherscanAddressWithDai);

        await hre.network.provider.request({
		    method: "hardhat_impersonateAccount",
		    params: [etherscanAddressWithUsdt],
	    });

	    accountWithUsdt = await ethers.getSigner(etherscanAddressWithUsdt);

        await hre.network.provider.request({
		    method: "hardhat_impersonateAccount",
		    params: [etherscanAddressWithUsdc],
	    });

	    accountWithUsdc = await ethers.getSigner(etherscanAddressWithUsdc);  

        await hre.network.provider.request({
		    method: "hardhat_impersonateAccount",
		    params: [etherscanAddressWithLink],
	    });

	    accountWithLink = await ethers.getSigner(etherscanAddressWithLink);                 

        dai = new ethers.Contract("0x6b175474e89094c44da98b954eedeac495271d0f", daiABI);
        usdt = new ethers.Contract("0xdAC17F958D2ee523a2206206994597C13D831ec7", usdtABI);
        usdc = new ethers.Contract("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", usdcABI);
        link = new ethers.Contract("0x514910771AF9Ca656af840dff83E8264EcF986CA", linkABI);

        mock = await Mock.deploy(link.address)
        await mock.deployed()
  
        randomNumber = await RandomNumber.deploy(mock.address)
        await randomNumber.deployed()

        lottery = await Lottery.deploy();
        await lottery.initialize(randomNumber.address)


        
});

    describe("Deployment", function () {

        it("Check if addresses of token owners are right", async function () {
            expect(accountWithDai.address.toLowerCase()).to.be.equal(etherscanAddressWithDai.toLowerCase())
            expect(accountWithUsdt.address.toLowerCase()).to.be.equal(etherscanAddressWithUsdt.toLowerCase())
            expect(accountWithUsdc.address.toLowerCase()).to.be.equal(etherscanAddressWithUsdc.toLowerCase())
            expect(accountWithLink.address.toLowerCase()).to.be.equal(etherscanAddressWithLink.toLowerCase())
        })

        it("Test start lottery", async function() {
            await expect(lottery.connect(account1).startLottery()).to.be.revertedWith("Not owner");
            const startOfLotteryBeforeFunction = await lottery.startOfCurrentLottery()
            const currentLotteryBeforeFunction = await lottery.currentLottery()
            const stateOfTokenReceptionBeforeFunction = await lottery.tokenReceptionIsActive()

            expect(startOfLotteryBeforeFunction).to.be.equal(0)
            expect(currentLotteryBeforeFunction).to.be.equal(0)
            expect(stateOfTokenReceptionBeforeFunction).to.be.equal(false)

            await lottery.connect(owner).startLottery()

            const startOfLotteryAfterFunction = await lottery.startOfCurrentLottery()
            const currentLotteryAfterFunction = await lottery.currentLottery()
            const stateOfTokenReceptionAfterFunction = await lottery.tokenReceptionIsActive()

            expect(startOfLotteryBeforeFunction < startOfLotteryAfterFunction).to.be.equal(true)
            expect(currentLotteryAfterFunction).to.be.equal(1)
            expect(stateOfTokenReceptionAfterFunction).to.be.equal(true)
        })

        it("Test Only owner", async function() {
            await expect(lottery.connect(account1).startLottery()).to.be.revertedWith("Not owner");
            await expect(lottery.connect(account1).sendDaiToCompound()).to.be.revertedWith("Not owner");
            await expect(lottery.connect(account1).receiveDaiFromCompound()).to.be.revertedWith("Not owner");                                                
        
        })

        it("Test if I can send 0 Dai to compound", async function(){
            await lottery.connect(owner).startLottery()
            await expect(lottery.connect(owner).sendDaiToCompound()).to.be.revertedWith("The lottery hasn't sold tickets");   
        })
        
        it("Test time problems", async function(){
            await lottery.connect(owner).startLottery()
            await lottery.connect(owner).buyTicketsWithEth({value: toWei(1)})
            await expect(lottery.connect(owner).sendDaiToCompound()).to.be.revertedWith("You have to wait 2 days after the start of the lottery");
            await increaseTime(toDays(2))
            await lottery.connect(owner).sendDaiToCompound()
            await expect(lottery.connect(owner).receiveDaiFromCompound()).to.be.revertedWith("You have to wait 5 days to receive tokens from compound");
        })

        it("Test that you only can do actions of the lottery when it's possible", async function(){
            await lottery.connect(owner).sendEth(accountWithLink.address, { value: toWei(10) });
            await link.connect(accountWithLink).transfer(randomNumber.address, toWei(100));
            await lottery.connect(owner).startLottery();
			await lottery.connect(owner).buyTicketsWithEth({ value: toWei(1) });
			await expect(lottery.connect(owner).startLottery()).to.be.revertedWith("You can't start a lottery when other is active");
			await increaseTime(toDays(2));
            await lottery.connect(owner).sendDaiToCompound();
			await expect(lottery.connect(owner).sendDaiToCompound()).to.be.revertedWith("Tokens are already in compound"); 
            await increaseTime(toDays(5));      
            await lottery.connect(owner).receiveDaiFromCompound();             
			await expect(lottery.connect(owner).receiveDaiFromCompound()).to.be.revertedWith("Tokens are not in compound");        
        
        })

        it("Test buy tickets with a tiny amount of ether",  async function() {
            await expect(lottery.connect(account1).buyTicketsWithEth({value: toWei(1)})).to.be.revertedWith("None lottery has been started");
            await lottery.connect(owner).startLottery()
            const amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai = await dai.connect(account1).balanceOf(account1.address)

            await lottery.connect(account1).buyTicketsWithEth({value: toWei(0.0001)})
            
            const currentLottery = await lottery.connect(owner).currentLottery()
            const amountOfIntervalsInCurrentLottery = await lottery.amountOfIntervalsByLottery(currentLottery)
            const amountOfSoldTicketsInCurrentLottery = await lottery.amountOfSoldTicketsByLottery(currentLottery)
            const amountOfTicketsThatAccount1HasInCurrentLottery = await lottery.amountOfTicketsByUserInLottery(currentLottery, account1.address)

            const amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai = await dai.connect(account1).balanceOf(account1.address)

            expect(currentLottery).to.be.equal(1)
            expect(amountOfIntervalsInCurrentLottery).to.be.equal(0)
            expect(amountOfSoldTicketsInCurrentLottery).to.be.equal(0)
            expect(amountOfTicketsThatAccount1HasInCurrentLottery).to.be.equal(0)

            expect(amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai > amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai).to.be.equal(true)
        })

        it("Test buy tickets with a normal amount of ether", async function(){

            await expect(lottery.connect(account1).buyTicketsWithEth({value: toWei(1)})).to.be.revertedWith("None lottery has been started");
            await lottery.connect(owner).startLottery()
            const amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai = await dai.connect(account1).balanceOf(account1.address)

            await lottery.connect(account1).buyTicketsWithEth({value: toWei(1.2)})
            
            const currentLottery = await lottery.connect(owner).currentLottery()
            const amountOfIntervalsInCurrentLottery = await lottery.amountOfIntervalsByLottery(currentLottery)
            const amountOfSoldTicketsInCurrentLottery = await lottery.amountOfSoldTicketsByLottery(currentLottery)
            const amountOfTicketsThatAccount1HasInCurrentLottery = await lottery.amountOfTicketsByUserInLottery(currentLottery, account1.address)

            const amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai = await dai.connect(account1).balanceOf(account1.address)

            expect(currentLottery).to.be.equal(1)
            expect(amountOfIntervalsInCurrentLottery).to.be.equal(1)
            expect(amountOfSoldTicketsInCurrentLottery > 1000).to.be.equal(true)
            expect(amountOfTicketsThatAccount1HasInCurrentLottery > 1000).to.be.equal(true)
            expect(amountOfTicketsThatAccount1HasInCurrentLottery).to.be.equal(amountOfSoldTicketsInCurrentLottery)

            expect(amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai > amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai).to.be.equal(true)  
        })

        it("Test buy tickets with a tiny amount of a stablecoins different than Dai",  async function() {
            await lottery.sendEth(accountWithUsdc.address , {value: toWei(10)})
            await expect(lottery.connect(accountWithUsdc).buyTicketsWithTokens(usdc.address, 100000)).to.be.revertedWith("None lottery has been started");
            await lottery.connect(owner).startLottery()
            const amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithUsdc).balanceOf(accountWithUsdc.address)
            await usdc.connect(accountWithUsdc).approve(lottery.address, 100000);

            expect(await usdc.connect(accountWithUsdc).allowance(accountWithUsdc.address, lottery.address)).to.be.equal(100000);
           
            await lottery.connect(accountWithUsdc).buyTicketsWithTokens(usdc.address, 100000)
           
            const currentLottery = await lottery.connect(owner).currentLottery()
            const amountOfIntervalsInCurrentLottery = await lottery.amountOfIntervalsByLottery(currentLottery)
            const amountOfSoldTicketsInCurrentLottery = await lottery.amountOfSoldTicketsByLottery(currentLottery)
            const amountOfTicketsThatAccountWithUsdcHasInCurrentLottery = await lottery.amountOfTicketsByUserInLottery(currentLottery, accountWithUsdc.address)

            const amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithUsdc).balanceOf(accountWithUsdc.address)

            expect(currentLottery).to.be.equal(1)
            expect(amountOfIntervalsInCurrentLottery).to.be.equal(0)
            expect(amountOfSoldTicketsInCurrentLottery).to.be.equal(0)
            expect(amountOfTicketsThatAccountWithUsdcHasInCurrentLottery).to.be.equal(0)

            expect(amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai > amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai).to.be.equal(true)
        })

        it("Test buy tickets with a normal amount of a stablecoins different than Dai",  async function() {
            await lottery.sendEth(accountWithUsdc.address , {value: toWei(10)})
            await expect(lottery.connect(accountWithUsdc).buyTicketsWithTokens(usdc.address, 1000000000)).to.be.revertedWith("None lottery has been started");
            await lottery.connect(owner).startLottery()
            const amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithUsdc).balanceOf(accountWithUsdc.address)
           
            await usdc.connect(accountWithUsdc).approve(lottery.address, 1000000000)

            await lottery.connect(accountWithUsdc).buyTicketsWithTokens(usdc.address, 1000000000)
           
            const currentLottery = await lottery.connect(owner).currentLottery()
            const amountOfIntervalsInCurrentLottery = await lottery.amountOfIntervalsByLottery(currentLottery)
            const amountOfSoldTicketsInCurrentLottery = await lottery.amountOfSoldTicketsByLottery(currentLottery)
            const amountOfTicketsThatAccountWithUsdcHasInCurrentLottery = await lottery.amountOfTicketsByUserInLottery(currentLottery, accountWithUsdc.address)

            const amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithUsdc).balanceOf(accountWithUsdc.address)

            expect(currentLottery).to.be.equal(1)
            expect(amountOfIntervalsInCurrentLottery).to.be.equal(1)

            expect(amountOfSoldTicketsInCurrentLottery > 500).to.be.equal(true)
            expect(amountOfTicketsThatAccountWithUsdcHasInCurrentLottery > 500).to.be.equal(true)
       
            expect(amountOfTicketsThatAccountWithUsdcHasInCurrentLottery).to.be.equal(amountOfSoldTicketsInCurrentLottery)

            expect(fromWei(amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai) > fromWei(amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai)).to.be.equal(true)
        })

        it("Test buy tickets with a tiny amount of Dai",  async function() {
            await lottery.sendEth(accountWithDai.address , {value: toWei(10)})
            await lottery.connect(owner).startLottery()
            const amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithDai).balanceOf(accountWithDai.address)
            await dai.connect(accountWithDai).approve(lottery.address, toWei(0.1));

            expect(await dai.connect(accountWithDai).allowance(accountWithDai.address, lottery.address)).to.be.equal(toWei(0.1));

            await lottery.connect(accountWithDai).buyTicketsWithTokens(dai.address, toWei(0.1));
           
            const currentLottery = await lottery.connect(owner).currentLottery()
            const amountOfIntervalsInCurrentLottery = await lottery.amountOfIntervalsByLottery(currentLottery)
            const amountOfSoldTicketsInCurrentLottery = await lottery.amountOfSoldTicketsByLottery(currentLottery)
            const amountOfTicketsThatAccountWithDaiHasInCurrentLottery = await lottery.amountOfTicketsByUserInLottery(currentLottery, accountWithDai.address)

            const amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithDai).balanceOf(accountWithDai.address)

            expect(currentLottery).to.be.equal(1)
            expect(amountOfIntervalsInCurrentLottery).to.be.equal(0)
            expect(amountOfSoldTicketsInCurrentLottery).to.be.equal(0)
            expect(amountOfTicketsThatAccountWithDaiHasInCurrentLottery).to.be.equal(0)

            expect(fromWei(amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai)).to.be.equal(fromWei(amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai)) 
        })

        it("Test buy tickets with a normal amount of Dai",  async function() {
            await lottery.sendEth(accountWithDai.address , {value: toWei(10)})
            await lottery.connect(owner).startLottery()
            const amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithDai).balanceOf(accountWithDai.address)
            await dai.connect(accountWithDai).approve(lottery.address, toWei(1000));

            expect(await dai.connect(accountWithDai).allowance(accountWithDai.address, lottery.address)).to.be.equal(toWei(1000));

            await lottery.connect(accountWithDai).buyTicketsWithTokens(dai.address, toWei(1000));
           
            const currentLottery = await lottery.connect(owner).currentLottery()
            const amountOfIntervalsInCurrentLottery = await lottery.amountOfIntervalsByLottery(currentLottery)
            const amountOfSoldTicketsInCurrentLottery = await lottery.amountOfSoldTicketsByLottery(currentLottery)
            const amountOfTicketsThatAccountWithDaiHasInCurrentLottery = await lottery.amountOfTicketsByUserInLottery(currentLottery, accountWithDai.address)

            const amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithDai).balanceOf(accountWithDai.address)

            expect(currentLottery).to.be.equal(1)
            expect(amountOfIntervalsInCurrentLottery).to.be.equal(1)
            expect(amountOfSoldTicketsInCurrentLottery).to.be.equal(1000)
            expect(amountOfTicketsThatAccountWithDaiHasInCurrentLottery).to.be.equal(1000)

            expect(fromWei(amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai) < fromWei(amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai)).to.be.equal(true) 
        })

        it("Check that contract sends dai to compound", async function(){
            await lottery.startLottery()
            await lottery.connect(owner).buyTicketsWithEth({value: toWei(10)})
            await lottery.connect(account1).buyTicketsWithEth({ value: toWei(10) });
            await increaseTime(toDays(3));
            const amountOfDaiBeforeSendMoneyToCompound = await dai.connect(owner).balanceOf(lottery.address)

            await lottery.connect(owner).sendDaiToCompound()
     
            const amountOfCdai = await lottery.connect(owner).getCTokenDaiBalance();

            await increaseBlocks(10000);
            await lottery.redeemCErc20Tokens(amountOfCdai,"0x5d3a536e4d6dbd6114cc1ead35777bab948e3643");

            const amountOfDaiAfterSendMoneyToCompound = await dai.connect(owner).balanceOf(lottery.address);
            
            expect(amountOfDaiBeforeSendMoneyToCompound < amountOfDaiAfterSendMoneyToCompound).to.be.equal(true);    
            
        }) 

        it("Test random implementation", async function() {
            await lottery.connect(owner).sendEth(accountWithLink.address, {value: toWei(10)})
            await link.connect(accountWithLink).transfer(randomNumber.address, toWei(100))
            await randomNumber.getRandomNumber()
            const result1 = await randomNumber.randomNumber()
            
            await expect(result1).to.be.equal(900) 

        })

        it("Test random number implementation in principal contract", async function(){

            await lottery.connect(owner).sendEth(accountWithLink.address, {value: toWei(10)})
            await link.connect(accountWithLink).transfer(randomNumber.address, toWei(100))

            await lottery.getNumberOfWinner(17);

            const result1 = await lottery.numberWinnerOfLastLottery()

            expect(result1).to.be.equal(17)

            await lottery.getNumberOfWinner(19)

            const result2 = await lottery.numberWinnerOfLastLottery()

            expect(result2).to.be.equal(8)
      
        })

        it("Test Full Lottery", async function (){

            await lottery.connect(owner).startLottery()
            await link.connect(accountWithLink).transfer(randomNumber.address, toWei(100))
            await lottery.connect(account1).buyTicketsWithEth({value: toWei(5)})
            await lottery.connect(account2).buyTicketsWithEth({value: toWei(5)})
            await dai.connect(accountWithDai).approve(lottery.address, toWei(1000))
            await lottery.connect(accountWithDai).buyTicketsWithTokens(dai.address, toWei(1000))

            const currentLottery = await lottery.currentLottery()

            const amountOfTicketsOfAccount1 = await lottery.amountOfTicketsByUserInLottery(currentLottery, account1.address)
            const amountOfTicketsOfAccount2 = await lottery.amountOfTicketsByUserInLottery(currentLottery, account2.address)
            const amountOfTicketsOfAccountWithDai = await lottery.amountOfTicketsByUserInLottery(currentLottery, accountWithDai.address)

            const amountOfDaiOfAccount1AfterBuyTickets = await dai.connect(account1).balanceOf(account1.address)
            const amountOfDaiOfAccount2AfterBuyTickets = await dai.connect(account2).balanceOf(account2.address)
            const amountOfDaiOfAccountWithDaiAfterBuyTickets = await dai.connect(accountWithDai).balanceOf(accountWithDai.address)
            const amountOfDaiOfOwnerAfterBuyTickets = await dai.connect(owner).balanceOf(owner.address)
            
            const amountOfTicketsOfAccounts = [amountOfTicketsOfAccount1, amountOfTicketsOfAccount2, amountOfTicketsOfAccountWithDai]
            const amountOfDaiOfAccountsAfterBuyTickets = [amountOfDaiOfAccount1AfterBuyTickets, amountOfDaiOfAccount2AfterBuyTickets, amountOfDaiOfAccountWithDaiAfterBuyTickets]

            await increaseTime(toDays(2))

            await lottery.sendDaiToCompound()

            await increaseTime(toDays(5))  
            await lottery.receiveDaiFromCompound()

            const usersInLottery = [account1.address, account2.address, accountWithDai.address]

            const winnerOfLottery = await lottery.winnerByLottery(currentLottery)

            for(let i; i < usersInLottery.length; i++) {
                const amountOfTicketsOfCurrentUser = amountOfTicketsOfAccounts[i]
                const amountOfDaiOfCurrentUserAfterBuyTickets = amountOfDaiOfAccountsAfterBuyTickets[i]
                
                const amountOfDaiWithValueOfTicketsOfUsersAfterBuyTickets = toWei(amountOfTicketsOfCurrentUser + fromWei(amountOfDaiOfCurrentUserAfterBuyTickets))

                const totalAmountOfDaiOfCurrentUser = dai.connect(owner).balanceOf(usersInLottery[i])

                if(winnerOfLottery == usersInLottery[i]){
                    expect(fromWei(totalAmountOfDaiOfCurrentUser) > fromWei(amountOfDaiWithValueOfTicketsOfUsersAfterBuyTickets)).to.be.equal(true)
                } else {
                    expect(amountOfDaiWithValueOfTicketsOfUsersAfterBuyTickets).to.be.equal(totalAmountOfDaiOfCurrentUser)
                }   
            }  

            const amountOfDaiOfOwnerAfterGetAFee = await dai.connect(owner).balanceOf(owner.address)

            expect(fromWei(amountOfDaiOfOwnerAfterGetAFee) > fromWei(amountOfDaiOfOwnerAfterBuyTickets)).to.be.equal(true)

        })

        it("Check that once that the current election does not get money the next one start to do it", async function(){
            await lottery.connect(owner).startLottery()
            await lottery.connect(owner).buyTicketsWithEth({value: toWei(5)})
            await lottery.connect(account1).buyTicketsWithEth({value: toWei(6)})

            const currentLottery = await lottery.connect(owner).currentLottery()
            const amountOfTicketsSoldInFirstLotteryBeforeCloseIt = await lottery.connect(owner).amountOfSoldTicketsByLottery(currentLottery)
            await increaseTime(toDays(2))

            await lottery.sendDaiToCompound()
            await lottery.connect(owner).buyTicketsWithEth({value: toWei(5)})

            const amountOfTicketsSoldInFirstLotteryAfterCloseIt = await lottery.connect(owner).amountOfSoldTicketsByLottery(currentLottery)
            const amountOfTicketsSoldInSecondLottery = await lottery.connect(owner).amountOfSoldTicketsByLottery(currentLottery.toNumber() + 1)

            expect(amountOfTicketsSoldInFirstLotteryBeforeCloseIt).to.be.equal(amountOfTicketsSoldInFirstLotteryAfterCloseIt)
            expect(fromWei(amountOfTicketsSoldInSecondLottery) > 0).to.be.equal(true)
        }) 

        it("Test 2 lotteries", async function(){
					await lottery.connect(owner).startLottery();

					await link.connect(accountWithLink).transfer(randomNumber.address, toWei(100));
					await lottery.connect(owner).sendEth(accountWithUsdc.address, { value: toWei(1) });
					await lottery.connect(owner).sendEth(accountWithDai.address, { value: toWei(1) });

					await usdc.connect(accountWithUsdc).approve(lottery.address, toWei(100));
					await dai.connect(accountWithDai).approve(lottery.address, toWei(100));

					await lottery.connect(accountWithUsdc).buyTicketsWithTokens(usdc.address, 10 ** 8);
					await lottery.connect(accountWithDai).buyTicketsWithTokens(dai.address, toWei(12));
					await lottery.connect(owner).buyTicketsWithEth({ value: toWei(10) });
					await lottery.connect(account1).buyTicketsWithEth({ value: toWei(10) });
					await lottery.connect(account2).buyTicketsWithEth({ value: toWei(10) });

					const amountOfTicketsInLottery1BeforeCompound = await lottery.connect(owner).amountOfSoldTicketsByLottery(1);

					await increaseTime(toDays(2));

					await lottery.connect(owner).sendDaiToCompound();

					await lottery.connect(accountWithUsdc).buyTicketsWithTokens(usdc.address, 10 ** 9);
					await lottery.connect(accountWithDai).buyTicketsWithTokens(dai.address, toWei(12));
					await lottery.connect(owner).buyTicketsWithEth({ value: toWei(18) });
					await lottery.connect(account1).buyTicketsWithEth({ value: toWei(18) });
					await lottery.connect(account2).buyTicketsWithEth({ value: toWei(18) });

					const amounTOfDaiOfOwnerAfterBuyTicketsInLottery2 = await dai.connect(owner).balanceOf(owner.address);
					const amounTOfDaiOfAccount1AfterBuyTicketsInLottery2 = await dai.connect(owner).balanceOf(account1.address);
					const amounTOfDaiOfAccount2AfterBuyTicketsInLottery2 = await dai.connect(owner).balanceOf(account2.address);
					const amounTOfDaiOfAccountWithUsdcAfterBuyTicketsInLottery2 =await dai.connect(owner).balanceOf(accountWithUsdc.address);
					const amounTOfDaiOfAccountWithDaiAfterBuyTicketsInLottery2 = await dai.connect(owner).balanceOf(accountWithDai.address);

					const amountOfTicketsInLottery1AfterCompound = await lottery.connect(owner).amountOfSoldTicketsByLottery(1);
					const amountOfTicketsInLottery2 = await lottery.connect(owner).amountOfSoldTicketsByLottery(2);

					expect(Math.floor(amountOfTicketsInLottery1BeforeCompound)).to.be.equal(Math.floor(amountOfTicketsInLottery1AfterCompound));
					expect(amountOfTicketsInLottery2.toNumber() > 0).to.be.equal(true);

					await increaseTime(toDays(10));

					await lottery.connect(owner).receiveDaiFromCompound();

					const amounTOfDaiOfOwnerAfterReceiveMoneyOfLottery1 = await dai.connect(owner).balanceOf(owner.address)
					const amounTOfDaiOfAccount1AfterReceiveMoneyOfLottery1 = await dai.connect(owner).balanceOf(account1.address)
					const amounTOfDaiOfAccount2AfterReceiveMoneyOfLottery1 = await dai.connect(owner).balanceOf(account2.address)
					const amounTOfDaiOfAccountWithUsdcAfterReceiveMoneyOfLottery1 = await dai.connect(owner).balanceOf(accountWithUsdc.address)
					const amounTOfDaiOfAccountWithDaiAfterReceiveMoneyOfLottery1 = await dai.connect(owner).balanceOf(accountWithDai.address)

                    const listOfAddresses = [owner.address, account1.address, account2.address, accountWithUsdc.address, accountWithDai.address]
                    const amountOfDaiOfAddressAfterBuyTicketsOfLottery2 = [amounTOfDaiOfOwnerAfterBuyTicketsInLottery2,amounTOfDaiOfAccount1AfterBuyTicketsInLottery2,amounTOfDaiOfAccount2AfterBuyTicketsInLottery2,amounTOfDaiOfAccountWithUsdcAfterBuyTicketsInLottery2,amounTOfDaiOfAccountWithDaiAfterBuyTicketsInLottery2];
                    const amountOfDaiOfAddressAfterReceiveMoneyOfLottery1 = [amounTOfDaiOfOwnerAfterReceiveMoneyOfLottery1, amounTOfDaiOfAccount1AfterReceiveMoneyOfLottery1, amounTOfDaiOfAccount2AfterReceiveMoneyOfLottery1, amounTOfDaiOfAccountWithUsdcAfterReceiveMoneyOfLottery1,amounTOfDaiOfAccountWithDaiAfterReceiveMoneyOfLottery1 ]


                    const winnerOfLottery1 = await lottery.winnerByLottery(1);

                     for(let i = 0; i < listOfAddresses.length; i++) {
                        const amountOfDaiOfCurrentUserAfterReceiveMoneyOfLottery1 =  amountOfDaiOfAddressAfterReceiveMoneyOfLottery1[i]
                        const amountOfDaiOfCurrentUserAfterBuyTicketsOfLottery2 = amountOfDaiOfAddressAfterBuyTicketsOfLottery2[i]
                        const amountOfTicketsOfCurrentUserInLottery1 = await lottery.connect(owner).amountOfTicketsByUserInLottery(1, listOfAddresses[i])

                        if(winnerOfLottery1 == listOfAddresses[i]){
                            expect((Math.floor(fromWei(amountOfDaiOfCurrentUserAfterBuyTicketsOfLottery2)) + Math.floor(amountOfTicketsOfCurrentUserInLottery1.toNumber())) < Math.floor(fromWei(amountOfDaiOfCurrentUserAfterReceiveMoneyOfLottery1)));    
                        } else {
                            expect(Math.floor(fromWei(amountOfDaiOfCurrentUserAfterBuyTicketsOfLottery2)) + Math.floor(amountOfTicketsOfCurrentUserInLottery1.toNumber())).to.be.equal(Math.floor(fromWei(amountOfDaiOfCurrentUserAfterReceiveMoneyOfLottery1)));
                        }
                    }

                    await lottery.connect(owner).startLottery()

                    const amounTOfDaiOfOwnerBeforeReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(owner.address)
					const amounTOfDaiOfAccount1BeforeReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(account1.address)
					const amounTOfDaiOfAccount2BeforeReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(account2.address)
					const amounTOfDaiOfAccountWithUsdcBeforeReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(accountWithUsdc.address)
					const amounTOfDaiOfAccountWithDaiBeforeReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(accountWithDai.address)

                    await increaseTime(toDays(2));

                    await lottery.sendDaiToCompound();

                    await increaseTime(toDays(5));

                    await lottery.receiveDaiFromCompound();


                    const amounTOfDaiOfOwnerAfterReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(owner.address)
					const amounTOfDaiOfAccount1AfterReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(account1.address)
					const amounTOfDaiOfAccount2AfterReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(account2.address)
					const amounTOfDaiOfAccountWithUsdcAfterReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(accountWithUsdc.address)
					const amounTOfDaiOfAccountWithDaiAfterReceiveMoneyOfLottery2 = await dai.connect(owner).balanceOf(accountWithDai.address)

                    const amountOfDaiOfAddressBeforeReceiveMoneyOfLottery2 = [amounTOfDaiOfOwnerBeforeReceiveMoneyOfLottery2, amounTOfDaiOfAccount1BeforeReceiveMoneyOfLottery2,amounTOfDaiOfAccount2BeforeReceiveMoneyOfLottery2,amounTOfDaiOfAccountWithUsdcBeforeReceiveMoneyOfLottery2,amounTOfDaiOfAccountWithDaiBeforeReceiveMoneyOfLottery2];
                    
                    const amountOfDaiOfAddressAfterReceiveMoneyOfLottery2 = [amounTOfDaiOfOwnerAfterReceiveMoneyOfLottery2,amounTOfDaiOfAccount1AfterReceiveMoneyOfLottery2,amounTOfDaiOfAccount2AfterReceiveMoneyOfLottery2,amounTOfDaiOfAccountWithUsdcAfterReceiveMoneyOfLottery2, amounTOfDaiOfAccountWithDaiAfterReceiveMoneyOfLottery2];

                    const winnerOfLottery2 = await lottery.winnerByLottery(2);

					for (let i = 0;i < listOfAddresses.length; i++) {
						const amountOfDaiOfCurrentUserBeforeReceiveMoneyOfLottery2 = amountOfDaiOfAddressBeforeReceiveMoneyOfLottery2[i];
						const amountOfDaiOfCurrentUserAfterReceiveMoneyOfLottery2 = amountOfDaiOfAddressAfterReceiveMoneyOfLottery2[i];

						const amountOfTicketsOfCurrentUserInLottery2 = await lottery.connect(owner).amountOfTicketsByUserInLottery(2,listOfAddresses[i]);

						if (winnerOfLottery2 ==listOfAddresses[i]) {
							expect(
								Math.floor(fromWei(amountOfDaiOfCurrentUserBeforeReceiveMoneyOfLottery2)) +
									Math.floor(amountOfTicketsOfCurrentUserInLottery2.toNumber()) <
									Math.floor(fromWei(amountOfDaiOfCurrentUserAfterReceiveMoneyOfLottery2)),
							);
						} else if (listOfAddresses[i] !== owner.address){
							expect(
								Math.floor(fromWei(amountOfDaiOfCurrentUserBeforeReceiveMoneyOfLottery2)) +
									Math.floor(amountOfTicketsOfCurrentUserInLottery2.toNumber()),
							).to.be.equal(
								Math.floor(fromWei(amountOfDaiOfCurrentUserAfterReceiveMoneyOfLottery2)),
							);
						} else {
                            							expect(
																						Math.floor(
																							fromWei(
																								amountOfDaiOfCurrentUserBeforeReceiveMoneyOfLottery2,
																							),
																						) +
																							Math.floor(
																								amountOfTicketsOfCurrentUserInLottery2.toNumber(),
																							) <
																							Math.floor(
																								fromWei(
																									amountOfDaiOfCurrentUserAfterReceiveMoneyOfLottery2,
																								),
																							),
																					);
                        }
					}
                    
				})  
    });
});
