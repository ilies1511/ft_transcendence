FROM ubuntu:latest

# avoid interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# basic tools
RUN apt-get update && apt-get install -y \
  git curl build-essential cmake sudo \
  && rm -rf /var/lib/apt/lists/*

# install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - \
  && apt-get update && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

# Clipboard helpers for Neovim
RUN apt-get update && apt-get install -y \
    wl-clipboard \
  && rm -rf /var/lib/apt/lists/*

# dependencies for your nvim config
RUN apt-get update && apt-get install -y \
    cargo ripgrep zip wget fd-find \
  && rm -rf /var/lib/apt/lists/*

# nvim install
RUN git clone https://github.com/neovim/neovim.git /tmp/neovim \
  && cd /tmp/neovim \
  && make CMAKE_BUILD_TYPE=RelWithDebInfo \
  && make install \
  && rm -rf /tmp/neovim

# global npm tools
RUN npm install -g typescript typescript-language-server

# create non-root user
ARG USERNAME=frapp
ARG UID=1000
ARG GID=1000
RUN groupadd -g $GID $USERNAME \
  && useradd -u $UID -g $GID -m $USERNAME \
  && echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$USERNAME \
  && chown -R $UID:$GID /usr/local /opt /home/$USERNAME

USER $USERNAME
ENV HOME=/home/$USERNAME
WORKDIR /home/$USERNAME/app
CMD ["bash"]
