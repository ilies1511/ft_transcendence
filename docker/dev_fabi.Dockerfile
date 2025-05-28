FROM debian:latest


# basic tools
RUN apt-get update && apt-get install -y \
  git curl build-essential cmake

# nvim install
RUN git clone https://github.com/neovim/neovim.git
RUN cd neovim \
	&& make CMAKE_BUILD_TYPE=RelWithDebInfo \
	&& make install

#dependencies for my nvim config
RUN apt-get install -y cargo
RUN apt-get install -y ripgrep
RUN apt-get install -y zip
RUN apt-get install -y wget
RUN apt-get install -y fd-find

# Clipboard helpers for Neovim ---------------------
RUN apt-get update && apt-get install -y \
    wl-clipboard


#install node
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt install nodejs -y

RUN npm install -g typescript

#WORKDIR /app



CMD ["bash"]
