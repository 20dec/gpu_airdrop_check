const { ethers } = require('ethers');

const addressesToCheck = [
'0x4325d09777f68f78c5712cdccc953f739b956090',
'0x84B1aB3D06Bb065074b577ecE55De1b2cbd9311b',
'0xafa464E614437C87cD1dBC16699b3C8bF9FA63eE',
'0x87fc424c186f5EE2cc7ad073c8354C59110a3DDc',
];

const RPC_URL = 'https://rpc.gpu.net/';
const CONTRACT_ADDRESS = '0x44dfda6f10ad5636f584a3d44280895b55299964';

const METHOD_SIGNATURES = {
    eligibilityCheck1: '0x6e21fc87',
    eligibilityCheck2: '0xcc29c923'
};

class GPUTokenEligibilityChecker {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
    }

    async checkEligibility(address) {
        try {
            const normalizedAddress = address.toLowerCase().replace('0x', '');
            
            if (!/^[0-9a-f]{40}$/i.test(normalizedAddress)) {
                throw new Error('Invalid address format');
            }

            const paddedAddress = normalizedAddress.padStart(64, '0');

            const callData1 = METHOD_SIGNATURES.eligibilityCheck1 + paddedAddress;
            const callData2 = METHOD_SIGNATURES.eligibilityCheck2 + paddedAddress;

            const [result1, result2] = await Promise.all([
                this.provider.call({
                    to: CONTRACT_ADDRESS,
                    data: callData1
                }),
                this.provider.call({
                    to: CONTRACT_ADDRESS,
                    data: callData2
                })
            ]);

            const amount1 = this.parseAmount(result1);
            const amount2 = this.parseAmount(result2);
            
            const maxAmount = amount1 > amount2 ? amount1 : amount2;
            const isEligible = maxAmount > 0;

            return {
                address: `0x${normalizedAddress}`,
                isEligible: isEligible,
                amount: maxAmount
            };

        } catch (error) {
            return {
                address: address,
                isEligible: false,
                amount: 0,
                error: error.message
            };
        }
    }


    parseAmount(hexResult) {
        try {
            const isZero = hexResult === '0x' + '0'.repeat(64);
            if (isZero) return 0;
            
            const bigIntValue = ethers.getBigInt(hexResult);

            const amount = parseFloat(ethers.formatEther(bigIntValue));
            return amount;
        } catch (error) {
            return 0;
        }
    }

    async checkMultipleAddresses(addresses) {
        const results = [];
        
        console.log(`Checking ${addresses.length} addresses...\n`);
        
        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            const result = await this.checkEligibility(address);
            results.push(result);
            
            this.printResult(result, i + 1);
            
            if (i < addresses.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return results;
    }

    printResult(result, index = null) {
        const prefix = index ? `${index}. ` : '';
        const status = result.isEligible ? '✅ Eligible' : '❌ Not Eligible';
        const amount = result.amount > 0 ? result.amount.toFixed(6) : '0';
        
        if (result.error) {
            console.log(`${prefix}❌ Error - ${result.address} - ${result.error}`);
        } else {
            console.log(`${prefix}${status} - ${result.address} - ${amount} GPU`);
        }
    }

    printSummary(results) {
        const eligible = results.filter(r => r.isEligible && !r.error);
        const notEligible = results.filter(r => !r.isEligible && !r.error);
        const errors = results.filter(r => r.error);
        const totalAmount = eligible.reduce((sum, r) => sum + r.amount, 0);

        console.log('\n' + '='.repeat(50));
        console.log('SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total Addresses Checked: ${results.length}`);
        console.log(`✅ Eligible: ${eligible.length}`);
        console.log(`❌ Not Eligible: ${notEligible.length}`);
        console.log(`⚠️  Errors: ${errors.length}`);
        console.log(`💰 Total Amount: ${totalAmount.toFixed(6)} GPU`);
        console.log('='.repeat(50));
    }
}

async function main() {
    const checker = new GPUTokenEligibilityChecker();
    
    try {
        console.log('GPU.net Token Eligibility Checker');
        console.log('='.repeat(50));
        
        if (addressesToCheck.length === 1) {
            const result = await checker.checkEligibility(addressesToCheck[0]);
            checker.printResult(result);
        } else {
            const results = await checker.checkMultipleAddresses(addressesToCheck);
            checker.printSummary(results);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

module.exports = GPUTokenEligibilityChecker;

if (require.main === module) {
    main();
}