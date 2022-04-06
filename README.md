# Lottery Project

This project is a lottery where the participants get their money back. The smart contract converts the eth or stablecoins of the users in Dai and sends the dai to Compound Finance to gain an interest rate

##### Currently the randomFunction doesn't work, it should work with the implementation of one

The owner should do this:

Call the function startLottery

Start to recolect money

Call the function sendDaiToCompound 

That sends the Dai to Compound

Call the function receiveDaiFromCompound

That recolects the Dai from compounds, gives to each user his original money, takes a 5% of the interest generated for Compound for the owner and gives the rest to a random user

