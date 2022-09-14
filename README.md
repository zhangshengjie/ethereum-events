# ethereum-events


### **Init**
```bash
npm install
```

### **Build**
```bash
make publish
```

### **Run**
```bash
# install docker
sudo curl -fsSL https://get.docker.com | sh

# run docker
sudo docker run -d --name ethereum-events \
    -v '/Users/<your path>/ethereum-events/abi/':'/root/dist/abi/':ro \
    -v '/Users/<your path>/ethereum-events/config.yaml':'/root/config.yaml':ro \
    -v '/home/<your path>/config.yaml':'/root/config.yaml' \
    cejay/ethereum-events:latest
```
