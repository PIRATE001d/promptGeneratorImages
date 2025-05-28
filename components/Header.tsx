
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="py-8 text-center">
      <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-600">
        Creative Prompt Forge
      </h1>
      <p className="mt-3 text-lg text-slate-400">
        Transform categories into unique, artistic image prompts.
      </p>
    </header>
  );
};

export default Header;
