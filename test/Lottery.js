const { expect } = require("chai");
const { ethers, upgrades } = require( "hardhat" );
const { daiABI, usdtABI, usdcABI, linkABI } = require("../abis/abis.json");
const {toWei, fromWei, toDays, increaseTime, increaseBlocks} = require("./utils");

// Testear comprar con erc20s
// Testear comprar con Dai
//Testear betas de compound
// Testear que cuando este cerrado se compra el ticket de la siguiente lottery
// Testear obtener ganador

//No vas mal, avanzaste que jode en la noche


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

        randomNumber = await RandomNumber.deploy()
        await randomNumber.deployed()

        lottery = await Lottery.deploy();
        await lottery.initialize(randomNumber.address)

        mock = await Mock.deploy(link.address)
        await mock.deployed()
        
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

        /*it("Test random implementation", async function() {
                        await lottery.connect(owner).sendEth(accountWithLink.address, {value : toWei(10)})
            await link.connect(accountWithLink).transfer(randomNumber.address, toWei(1000))        
            await randomNumber.connect(owner).getRandomNumber()

            //const lastRequestId = await randomNumber.connect(owner).lastRequestId()

            await mock.connect(owner).callBackWithRandomness(lastRequestId, 777, randomNumber.address)

            let result = await lottery.connect(owner).getNumberOfWinner(10)

            console.log(result)
            /*await lottery.connect(owner).startLottery()
            await lottery.connect(owner).sendEth(accountWithLink.address, {value : toWei(10)})
            await link.connect(accountWithLink).transfer(randomNumber.address, toWei(1000))
            const numberRandom = await lottery.connect(accountWithLink).getNumberOfWinner(30);
            console.log(numberRandom) 
        })*/

        /*it("Test buy tickets with a normal amount of Dai",  async function() {
           await expect(lottery.connect(accountWithUsdt).buyTicketsWithTokens(usdt.address, 100000000)).to.be.revertedWith("None lottery has been started");
           await lottery.connect(owner).startLottery()
           await lottery.connect(owner).sendEth(accountWithUsdt.address,{value: toWei(10)})
           const amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithUsdt).balanceOf(accountWithUsdt.address)
           
           await usdt.connect(accountWithUsdt).approve(lottery.address, 1000000000)

           await lottery.connect(accountWithUsdt).buyTicketsWithTokens(usdt.address, 100000000)
           
           const currentLottery = await lottery.connect(owner).currentLottery()
           const amountOfIntervalsInCurrentLottery = await lottery.amountOfIntervalsByLottery(currentLottery)
           const amountOfSoldTicketsInCurrentLottery = await lottery.amountOfSoldTicketsByLottery(currentLottery)
           const amountOfTicketsThatAccountWithUsdtHasInCurrentLottery = await lottery.amountOfTicketsByUserInLottery(currentLottery, accountWithUsdt.address)

           const amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai = await dai.connect(accountWithUsdt).balanceOf(accountWithUsdt.address)

           expect(currentLottery).to.be.equal(1)
           expect(amountOfIntervalsInCurrentLottery).to.be.equal(1)
           expect(amountOfSoldTicketsInCurrentLottery > 5).to.be.equal(true)
           expect(amountOfTicketsThatAccountWithUsdtHasInCurrentLottery > 5).to.be.equal(true)
       
            expect(amountOfTicketsThatAccount1HasInCurrentLottery).to.be.equal(amountOfSoldTicketsInCurrentLottery)

           expect(amountOfDaiOfUserAfterThatTheContractGivesHimHisExtraDai > amountOfDaiOfUserBeforeThatTheContractGivesHimHisExtraDai).to.be.equal(true)
        })*/



        /*it("Test randomNumber Implementation", async function() {
            //await 
            await lottery.connect(owner).sendEth(accountWithLink.address, {value: toWei(1)})
            await link.connect(accountWithLink).transfer(randomNumber.address, toWei(1000))
           
           expect(await link.connect(accountWithLink).balanceOf(randomNumber.address)).to.be.equal(toWei(1000))

           const randomTransaction = await randomNumber.connect(owner).getRandomNumber()

           console.log(randomTransaction)

           //await vrfCoordinator.callBackWithRandomness(randomTransaction, '777', randomNumber.address)
           //let randomNumberValue = await randomNumber.randomResult()
           //console.log(randomNumberValue)
           //expect(randomNumberValue).to.be.equal(777)
        }) */

       /* it("Test creation of item in market", async function () {
            await market.connect(account1).sendEther(accountWithToken.address ,{value: toWei(10)})

            expect(await market.amountOfItems()).to.be.equal(0);
            expect(await market.itemIsInMarket(1)).to.be.equal(false);

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(0);

            await expect(market.connect(accountWithToken).createOffer(parallel.address, 10254, 10, 100000000000000, 30)).to.be.revertedWith("You don't have enough tokens")
            await expect(market.connect(accountWithToken).createOffer(parallel.address, 10254, 1, 100, 30)).to.be.revertedWith("The deadline has to be after the creation of the token")

            await market.connect(accountWithToken).createOffer(parallel.address, 10254, 1, 1000000000000000, 30)  

            expect(await market.amountOfItems()).to.be.equal(1);
            expect(await market.itemIsInMarket(1)).to.be.equal(true);
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(1);     
        }) 

        it("Test payment with ethereum", async function () {
            await market.connect(accountWithToken).createOffer(parallel.address, 10254, 1, 1000000000000000, 1)

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(1)

            await parallel.connect(accountWithToken).setApprovalForAll(market.address, true)

            expect(await parallel.connect(accountWithToken).balanceOf(accountWithToken.address,10254)).to.be.equal(1)
            expect(await parallel.connect(accountWithToken).balanceOf(account2.address,10254)).to.be.equal(0)

            await expect(market.connect(account2).buyWithEther(2, {value: toWei(5)})).to.be.revertedWith("The item is not in the market")
            await expect(market.connect(account2).buyWithEther(1, {value: toWei(5)})).to.be.revertedWith("The amount of ether is not right")

            let amountOfEtherToPay = await market.connect(owner).getValueOfTokensInEther(1)

            await market.connect(account2).buyWithEther(1, {value: amountOfEtherToPay})

            expect(await parallel.connect(accountWithToken).balanceOf(accountWithToken.address,10254)).to.be.equal(0)
            expect(await parallel.connect(accountWithToken).balanceOf(account2.address,10254)).to.be.equal(1)
            expect(await market.itemIsInMarket(1)).to.be.equal(false)
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(0)
        })

        it("Test payment with Dai", async function () {
            expect(await parallel.connect(accountWithToken).balanceOf(account2.address,10254)).to.be.equal(1)

            await market.connect(account2).createOffer(parallel.address, 10254, 1, 1000000000000000, 3)

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, account2.address, 10254)).to.be.equal(1)

            await parallel.connect(account2).setApprovalForAll(market.address, true)

            expect(await parallel.connect(accountWithToken).balanceOf(account2.address,10254)).to.be.equal(1)
            expect(await parallel.connect(accountWithToken).balanceOf(accountWithDai.address,10254)).to.be.equal(0)

            await expect(market.connect(account1).buyWithDai(2)).to.be.revertedWith("The item is not in the market")
            await expect(market.connect(account1).buyWithDai(1)).to.be.revertedWith("You don't have enough tokens")

            let priceInDai = await market.getValueOfTokensInDai(1)

            await dai.connect(accountWithDai).approve(market.address, priceInDai)
            await market.connect(accountWithDai).buyWithDai(1)

            expect(await parallel.connect(account2).balanceOf(account2.address,10254)).to.be.equal(0)
            expect(await parallel.connect(accountWithToken).balanceOf(accountWithDai.address,10254)).to.be.equal(1)
            expect(await market.itemIsInMarket(1)).to.be.equal(false)
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithToken.address, 10254)).to.be.equal(0)
        })

        it("Test payment with Link", async function () {
            expect(await parallel.connect(accountWithDai).balanceOf(accountWithDai.address,10254)).to.be.equal(1)

            await market.connect(accountWithDai).createOffer(parallel.address, 10254, 1, 1000000000000000, 3)

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithDai.address, 10254)).to.be.equal(1)

            await parallel.connect(accountWithDai).setApprovalForAll(market.address, true)

            expect(await parallel.connect(accountWithDai).balanceOf(accountWithDai.address,10254)).to.be.equal(1)
            expect(await parallel.connect(accountWithDai).balanceOf(accountWithLink.address,10254)).to.be.equal(0)

            await expect(market.connect(account1).buyWithLink(2)).to.be.revertedWith("The item is not in the market")
            await expect(market.connect(account1).buyWithLink(1)).to.be.revertedWith("You don't have enough tokens")

            let priceInLink = await market.getValueOfTokensInLink(1)

            await link.connect(accountWithLink).approve(market.address, priceInLink)

            await market.connect(accountWithLink).buyWithLink(1)

            expect(await parallel.connect(accountWithDai).balanceOf(accountWithDai.address,10254)).to.be.equal(0)
            expect(await parallel.connect(accountWithLink).balanceOf(accountWithLink.address,10254)).to.be.equal(1)
            expect(await market.itemIsInMarket(1)).to.be.equal(false)
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithDai.address, 10254)).to.be.equal(0)
        })

        it("Test cancell offer", async function () {
            await expect(market.connect(account1).cancelOffer(2)).to.be.revertedWith("Item is not in market")

            expect(await parallel.connect(accountWithLink).balanceOf(accountWithLink.address,10254)).to.be.equal(1)

            await market.connect(accountWithLink).createOffer(parallel.address, 10254, 1, 1000000000000000, 3)

            expect(await market.itemIsInMarket(1)).to.be.equal(true)
            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithLink.address, 10254)).to.be.equal(1)

            await expect(market.connect(account1).cancelOffer(1)).to.be.revertedWith("You are not the owner of the tokens")

            await market.connect(accountWithLink).cancelOffer(1)

            expect(await market.tokensAlreadyInMarketByTokenAddressAndUser(parallel.address, accountWithLink.address, 10254)).to.be.equal(0)
            expect(await market.itemIsInMarket(1)).to.be.equal(false)
        })

        it("Test fuctions that change transaction values", async function() {
					expect(await market.recipient()).to.be.equal(owner.address);
					expect(await market.fee()).to.be.equal(1);

					await market.changeRecipientAddress(account1.address)
					 await market.changePercentageOfFee(5)

					expect(await market.recipient()).to.be.equal(account1.address)
					expect(await market.fee()).to.be.equal(5);
				})*/   
    });
});
