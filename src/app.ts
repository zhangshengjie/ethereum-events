/*
 * @Description: 
 * @Version: 1.0
 * @Autor: z.cejay@gmail.com
 * @Date: 2022-08-08 21:53:06
 * @LastEditors: cejay
 * @LastEditTime: 2022-10-18 19:58:44
 */

import { ContractConfig } from './entity/contractConfig';
import { MysqlHelper } from './utils/mysqlHelper';
import { YamlConfig } from './utils/yamlConfig';
import { EventData } from 'web3-eth-contract';

process.on('unhandledRejection', (err) => {
    console.error(err);
    process.exit(1);
});


// print current path
console.log(`work path: ${__dirname}`);

const yamlConfig: YamlConfig = YamlConfig.getInstance();
const mysqlHelper = MysqlHelper.getInstance();


async function sleep(s: number) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(true);
        }, s * 1000);
    });
}



async function _eventWatchForever(indexId: number, config: ContractConfig) {
    let lastBlock = false;
    const web3 = yamlConfig.web3Provider.web3Instance;
    const contract = config.contract;
    let block_from = 0;
    {
        const sql = `select logindex as blockNumber,blockHash from ${yamlConfig.mysql.table} where id = ${indexId}`;
        const result = await mysqlHelper.queryparams(sql);
        let lastBlockNumber: number = result[0].blockNumber;
        let lastBlockHash: string = result[0].blockHash;
        const blockHash = (await web3.eth.getBlock(lastBlockNumber)).hash;
        if (blockHash == lastBlockHash) {
            block_from = lastBlockNumber + 1;
        } else {
            // get block rollback height
            if (lastBlockNumber < 100) {
                throw new Error(`block rollback height is too large, lastBlockNumber=${lastBlockNumber}`);
            }
            block_from = lastBlockNumber;
            // review last 12 blocks
            for (let index = 1; index < 12; index++) {
                const _block = lastBlockNumber - index;
                // get block hash from db
                const sql = `select blockHash from ${yamlConfig.mysql.table} where contract ='${config.address}' and blockNumber = ${_block} and invalid = 0 limit 1`;
                const result = await mysqlHelper.queryparams(sql);
                if (result.length > 0) {
                    const block = await web3.eth.getBlock(_block);
                    if (block.hash === result[0].blockHash) {
                        break;
                    } else {
                        block_from = _block;
                    }
                }
            }
            // set to invalid
            const sql = `update ${yamlConfig.mysql.table} set invalid = 1 where contract ='${config.address}' and blockNumber >= ${block_from}`;
            await mysqlHelper.queryparams(sql);
        }
    }
    // get last block
    let block_to = await web3.eth.getBlockNumber();
    if (block_to <= block_from) {
        console.log(`no new block, block_from=${block_from}, block_to=${block_to}`);
        return true;
    } else if (block_to - block_from > config.step) {
        block_to = block_from + config.step;
    } else {
        lastBlock = true;
    }
    let events: EventData[];
    if (config.events.length === 1) {
        events = await contract.getPastEvents(config.events[0], {
            fromBlock: block_from,
            toBlock: block_to
        });
    } else {
        events = await contract.getPastEvents('allEvents', {
            fromBlock: block_from,
            toBlock: block_to
        });
        if (events.length > 0 && config.events.length > 0) {
            // events filter by event
            events = events.filter((event) => {
                return config.events.includes(event.event);
            });
        }

    }
    //console.log(events);
    // add -> DB
    let insertSQLTempl = "";
    let useLastEvent = false;
    let blockNumTsMap = new Map<number, number>();
    if (events.length > 0) {
        if (events[events.length - 1].blockNumber === block_to) {
            useLastEvent = true;
        }
        const blockNumberSet = new Set<number>();
        for (let i = 0; i < events.length; i++) {
            const blockNumber = events[i].blockNumber;
            if (!blockNumberSet.has(blockNumber)) {
                blockNumberSet.add(blockNumber);
            }
        }
        const blockNumberArr = Array.from(blockNumberSet);
        const getBlockPromiseArr = [];
        for (let i = 0; i < blockNumberArr.length; i++) {
            getBlockPromiseArr.push(web3.eth.getBlock(blockNumberArr[i], false));
        }
        const getBlockResult = await Promise.all(getBlockPromiseArr);
        for (let i = 0; i < getBlockResult.length; i++) {
            let ts: number = 0;
            if (typeof (getBlockResult[i].timestamp) === 'string') {
                ts = parseInt(getBlockResult[i].timestamp as string, 10);
            } else {
                ts = getBlockResult[i].timestamp as number;
            }
            blockNumTsMap.set(getBlockResult[i].number, ts);
        }
    }


    if (useLastEvent) {
        insertSQLTempl = `update ${yamlConfig.mysql.table} set logindex=${block_to},blockHash='${events[events.length - 1].blockHash}' where id=${indexId}`;
    } else {
        let block = await web3.eth.getBlock(block_to);
        if (block && block.hash) {
            insertSQLTempl = `update ${yamlConfig.mysql.table} set logindex=${block_to},blockHash='${block.hash}' where id=${indexId}`;
        } else {
            throw new Error(`block is null, blockNumber=${block_to}`);
        }
    }
    if (events.length > 0) {
        let valueArr: string[] = [];
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const returnValuesStr = mysqlHelper.escape(JSON.stringify(event.returnValues));
            valueArr.push(`('${config.address}',${event.blockNumber},'${event.blockHash}','${event.transactionHash}',${blockNumTsMap.get(event.blockNumber)},${mysqlHelper.escape(event.event)},${event.logIndex},${returnValuesStr},0)`);
        }
        insertSQLTempl += `;INSERT INTO ${yamlConfig.mysql.table} (contract, blockNumber, blockHash, transactionHash, blocktime, eventname, logIndex, log, invalid ) VALUES ${valueArr.join(',')}`;
    }
    await mysqlHelper.queryparams(insertSQLTempl);
    console.log(`${new Date().toLocaleString()}\tname=${config.name},contract=${config.address},block_from=${block_from},block_to=${block_to},events=${events.length}`);
    return lastBlock;

}


async function eventWatchForever(indexId: number, config: ContractConfig) {
    while (true) {
        let hasSync = true;
        try {
            hasSync = await _eventWatchForever(indexId, config);
        } catch (error) {
            // if infura limit error, sleep 60s

            console.error(error);
            await sleep(30);
        }
        if (hasSync) {
            await sleep(config.interval);
        } else {
            await sleep(1);
        }
    }
}


async function main() {

    console.log(yamlConfig);

    // check table exists
    {
        const sql = `SELECT count(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${yamlConfig.mysql.database}' AND TABLE_NAME = '${yamlConfig.mysql.table}'`;
        const result = await mysqlHelper.queryparams(sql);
        if (result[0].c == 0) {
            console.log(`table ${yamlConfig.mysql.table} not exists`);
            // create table
            const sql = `CREATE TABLE ${yamlConfig.mysql.table} ( \
                    id int unsigned NOT NULL AUTO_INCREMENT,\
                    contract varchar(42) NOT NULL,\
                    blockNumber int unsigned NOT NULL,\
                    blockHash varchar(66) NOT NULL,\
                    transactionHash varchar(66) NOT NULL,\
                    blocktime decimal(11,0) unsigned NOT NULL,\
                    eventname varchar(255) NOT NULL,\
                    logIndex int unsigned NOT NULL,\
                    log json NOT NULL,\
                    invalid bit(1) NOT NULL DEFAULT b'0',\
                    used bit(1) NOT NULL DEFAULT b'0',\
                    PRIMARY KEY (id),\
                    KEY __logevents_contract (contract),\
                    KEY __logevents_blockNumber (blockNumber DESC) USING BTREE,\
                    KEY __logevents_invalid (invalid)\
                  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`
            await mysqlHelper.queryparams(sql);
        }
    }

    {

        const web3 = yamlConfig.web3Provider.web3Instance;
        for (const config of yamlConfig.contractConfigs) {
            // get index id
            const sql = `select id from ${yamlConfig.mysql.table} where contract = '${config.address}' and invalid = 1  and blockNumber = 0 LIMIT 1`;
            const result = await mysqlHelper.queryparams(sql);
            let indexId = 0;
            if (result.length > 0) {
                indexId = result[0].id;
            } else {
                const block = await web3.eth.getBlock(config.startBlock > 0 ? config.startBlock : 1);
                const sql = `INSERT INTO ${yamlConfig.mysql.table} ( contract, blockNumber, blockHash, transactionHash, blocktime, eventname, logIndex, log, invalid ) \
                VALUES \
                    ( '${config.address}', 0, '${block.hash}', '0x', 0, ' ', ${block.number}, '{"notion":"DO NOT EDIT OR DELETE!!!"}', 1 );`;

                const result = await mysqlHelper.queryparams(sql);
                indexId = result.insertId;
            }
            eventWatchForever(indexId, config);

        }
    }

}

main();
