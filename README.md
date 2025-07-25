# 🔐 Safe Passkeys Demo

This project demonstrates passkey-based cryptographic signing using:

- ✅ A **TypeScript** frontend
- ✅ A **Ruby on Rails** backend with **PostgreSQL**
- ✅ Real **passkey authentication**
- ✅ Blockchain-safe account abstraction using `ox` and Candide's abstractionkit

---

## 🧰 1. Install Ruby, PostgreSQL, Node.js (Ubuntu 22.04 / ROS Humble)

### Step 1: System dependencies

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  libssl-dev libreadline-dev zlib1g-dev \
  git curl
````


### Step 2: Node.js & Yarn

```bash
# Node.js (v16)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install -y yarn
```


### Step 3: Install Ruby using rbenv

```bash
git clone https://github.com/rbenv/rbenv.git ~/.rbenv
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(rbenv init -)"' >> ~/.bashrc
source ~/.bashrc

git clone https://github.com/rbenv/ruby-build.git ~/.rbenv/plugins/ruby-build

# Install Ruby
rbenv install 3.2.2
rbenv global 3.2.2

# Verify
ruby -v
```


### Step 4: Install Rails

```bash
gem install bundler
gem install rails
rbenv rehash
rails -v
```


### Step 5: Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib libpq-dev
sudo service postgresql start
```

---

## 🚀 2. Project Setup

### Backend (Rails + PostgreSQL)

```bash
cd rubyBackEnd/myapp
bundle install
rails db:create
rails db:migrate
```


### Frontend 

```bash
cd frontEnd
npm install
```


### Step 3: Configure Environment Variables

```bash
cd frontEnd
cp .env.example .env
```

Edit `.env` to configure the following:

* **Default Network:** Arbitrum Sepolia
* **VITE\_API\_BASE\_URL:** e.g. `http://localhost:3000`
* **VITE\_BUNDLER\_URL** / **VITE\_PAYMASTER\_URL**: default to public Candide endpoints or get your own from [Candide Dashboard](https://dashboard.candide.dev/)

---

## 🧪 3. Run the App

### Start backend 

```bash
cd rubyBackEnd/myapp
rails server
```


### Start frontend 

In a second terminal tab:

```bash
cd frontEnd
npm run dev
```

* Frontend: [http://localhost:5173](http://localhost:5173)
* Backend:  [http://localhost:3000](http://localhost:3000)

---

## ✅ 4. App Flow

1. Click **"Create Account"**

   * Enter a **username**
   * A **passkey** is created using your device
   * The **passkey**, **on-chain account address**, and **username** are stored in your PostgreSQL database

2. When you revisit the site:

   * Enter the **same username** to log in
   * The **saved passkey and account address** are fetched from the database

3. Click **"Mint NFT"**

   * The passkey signs the transaction locally
   * Transaction is sent to the bundler and sponsored by a paymaster

---

## 📚 Resources

* Safe Passkeys Documentation: [https://docs.candide.dev/wallet/plugins/passkeys/](https://docs.candide.dev/wallet/plugins/passkeys/)
* Candide Dashboard for API keys: [https://dashboard.candide.dev/](https://dashboard.candide.dev/)
* Vite: [https://vitejs.dev](https://vitejs.dev)
* Ruby on Rails: [https://rubyonrails.org](https://rubyonrails.org)
