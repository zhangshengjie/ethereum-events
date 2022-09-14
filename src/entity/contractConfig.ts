/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2022-09-14 14:55:57
 * @LastEditors: cejay
 * @LastEditTime: 2022-09-14 21:37:58
 */



import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

/*
    name: "BAYC"
    address: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d"
    abi: "./abi/bayc.ABI.json"
    events: ["Transfer", "ApprovalForAll"]
    startBlock: 14704581
    # interval in seconds
    interval: 15
*/


class ContractConfig {
    constructor(
        name: string,
        address: string,
        contract: Contract,
        events: string[],
        startBlock: number,
        step: number,
        interval: number,
    ) {
        this.name = name;
        this.address = address;
        this.contract = contract;
        this.events = events;
        this.startBlock = startBlock;
        this.step = step;
        this.interval = interval;
    }
    name: string;
    address: string;
    contract: Contract;
    events: string[];
    startBlock: number;
    step: number;
    interval: number;
}

export { ContractConfig };