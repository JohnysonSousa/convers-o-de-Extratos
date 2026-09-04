const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf-8');

const oldBlock = `                  {activeBanks.map(bank => {
                    const isSelected = selectedBankId === bank.id;
                    return (
                      <button 
                        key={bank.id}
                        onClick={() => setSelectedBankId(bank.id)}
                        className={\`flex flex-col items-center justify-center p-3 border rounded transition-all relative overflow-hidden group text-left \${isSelected ? 'border-[#3B82F6] bg-[#1A2B47]' : 'border-border-subtle bg-background hover:bg-surface-variant'}\`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-8 h-8 bg-[#3B82F6] rounded-bl-xl">
                            <Check size={12} className="text-white absolute bottom-1.5 left-1.5" />
                          </div>
                        )}
                        <div className="w-10 h-10 mb-2 flex items-center justify-center">
                          {bank.logoUrl ? (
                            <Image src={bank.logoUrl} fill referrerPolicy='no-referrer' alt={bank.name} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full rounded flex items-center justify-center text-[12px] font-bold text-white" style={{backgroundColor: bank.color}}>
                              {bank.initials}
                            </div>
                          )}
                        </div>
                        <span className={\`font-label-md text-[11px] font-semibold \${isSelected ? 'text-text-primary' : 'text-text-muted'}\`}>{bank.name}</span>
                      </button>
                    )
                  })}`;

const newBlock = `                  {activeBanks.map(bank => {
                    const isSelected = selectedBankId === bank.id;
                    const altText = bank.name === 'Stone' || bank.name === 'Caixa' 
                      ? \`Logotipo da \${bank.name}\` 
                      : \`Logotipo do \${bank.name}\`;
                      
                    return (
                      <button 
                        key={bank.id}
                        onClick={() => setSelectedBankId(bank.id)}
                        className={\`flex flex-col items-center justify-center p-3 border rounded transition-all relative overflow-hidden group text-center \${isSelected ? 'border-[#3B82F6] bg-[#1A2B47] ring-1 ring-[#3B82F6]' : 'border-border-subtle bg-background hover:bg-surface-variant hover:border-border-muted focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/50'}\`}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-8 h-8 bg-[#3B82F6] rounded-bl-xl z-10 flex items-start justify-end p-1">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                        <div className="w-full h-[48px] max-w-[120px] mb-2 flex items-center justify-center">
                          {(bank.logo || bank.logoUrl) ? (
                            <div className="relative w-full h-full bg-white/95 rounded-md flex items-center justify-center p-1 border border-white/20">
                              <Image 
                                src={bank.logo || bank.logoUrl || ''} 
                                fill 
                                referrerPolicy='no-referrer' 
                                alt={altText} 
                                className="object-contain p-1" 
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded flex items-center justify-center text-[12px] font-bold text-white" style={{backgroundColor: bank.color || '#333'}}>
                              {bank.initials || bank.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className={\`font-label-md text-[12px] font-semibold \${isSelected ? 'text-text-primary' : 'text-text-muted group-hover:text-text-primary'}\`}>{bank.name}</span>
                        {isSelected && <span className="sr-only">Banco selecionado: {bank.name}</span>}
                      </button>
                    )
                  })}`;

if (code.includes(oldBlock)) {
  fs.writeFileSync('app/page.tsx', code.replace(oldBlock, newBlock));
  console.log('Successfully updated app/page.tsx');
} else {
  console.log('Could not find oldBlock in app/page.tsx');
}
