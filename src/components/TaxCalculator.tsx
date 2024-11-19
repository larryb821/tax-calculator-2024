'use client'

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign } from 'lucide-react';

// Rest of the code remains the same
interface IncomeInputs {
  wages: string;
  interest: string;
  nonQualifiedDividends: string;
  qualifiedDividends: string;
  shortTermGains: string;
  longTermGains: string;
  otherIncome: string;
}

type FilingStatus = 'single' | 'joint' | 'head';

interface TaxBracket {
  rate: number;
  upTo: number;
}

interface TaxBrackets {
  single: TaxBracket[];
  joint: TaxBracket[];
  head: TaxBracket[];
}

interface StandardDeductions {
  single: number;
  joint: number;
  head: number;
}

interface TaxResults {
  ordinaryTax: number;
  qualifiedTax: number;
  totalTax: number;
  taxableOrdinaryIncome: number;
  taxableQualifiedIncome: number;
}

interface QualifiedIncome {
  qualifiedDividends: number;
  longTermGains: number;
}

export default function TaxCalculator() {
  // State with type definitions
  const [incomeInputs, setIncomeInputs] = useState<IncomeInputs>({
    wages: '',
    interest: '',
    nonQualifiedDividends: '',
    qualifiedDividends: '',
    shortTermGains: '',
    longTermGains: '',
    otherIncome: ''
  });
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [isItemized, setIsItemized] = useState<boolean>(false);
  const [itemizedAmount, setItemizedAmount] = useState<string>('');

  // 2024 Tax Brackets
  const taxBrackets: TaxBrackets = {
    single: [
      { rate: 0.10, upTo: 11600 },
      { rate: 0.12, upTo: 47150 },
      { rate: 0.22, upTo: 100525 },
      { rate: 0.24, upTo: 191950 },
      { rate: 0.32, upTo: 243725 },
      { rate: 0.35, upTo: 609350 },
      { rate: 0.37, upTo: Infinity }
    ],
    joint: [
      { rate: 0.10, upTo: 23200 },
      { rate: 0.12, upTo: 94300 },
      { rate: 0.22, upTo: 201050 },
      { rate: 0.24, upTo: 383900 },
      { rate: 0.32, upTo: 487450 },
      { rate: 0.35, upTo: 731200 },
      { rate: 0.37, upTo: Infinity }
    ],
    head: [
      { rate: 0.10, upTo: 16550 },
      { rate: 0.12, upTo: 63100 },
      { rate: 0.22, upTo: 100500 },
      { rate: 0.24, upTo: 191950 },
      { rate: 0.32, upTo: 243700 },
      { rate: 0.35, upTo: 609350 },
      { rate: 0.37, upTo: Infinity }
    ]
  };

  // 2024 Standard Deductions
  const standardDeductions: StandardDeductions = {
    single: 14600,
    joint: 29200,
    head: 21900
  };

  // Long-term capital gains tax brackets 2024
  const longTermGainsBrackets: TaxBrackets = {
    single: [
      { rate: 0.00, upTo: 47025 },
      { rate: 0.15, upTo: 518900 },
      { rate: 0.20, upTo: Infinity }
    ],
    joint: [
      { rate: 0.00, upTo: 94050 },
      { rate: 0.15, upTo: 583750 },
      { rate: 0.20, upTo: Infinity }
    ],
    head: [
      { rate: 0.00, upTo: 63000 },
      { rate: 0.15, upTo: 551350 },
      { rate: 0.20, upTo: Infinity }
    ]
  };

  const handleIncomeChange = (field: keyof IncomeInputs, value: string): void => {
    setIncomeInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateOrdinaryIncome = (): number => {
    const numbers = {
      wages: parseFloat(incomeInputs.wages) || 0,
      interest: parseFloat(incomeInputs.interest) || 0,
      nonQualifiedDividends: parseFloat(incomeInputs.nonQualifiedDividends) || 0,
      shortTermGains: parseFloat(incomeInputs.shortTermGains) || 0,
      otherIncome: parseFloat(incomeInputs.otherIncome) || 0
    };
    return Object.values(numbers).reduce((sum, num) => sum + num, 0);
  };

  const calculateQualifiedIncome = (): QualifiedIncome => {
    return {
      qualifiedDividends: parseFloat(incomeInputs.qualifiedDividends) || 0,
      longTermGains: parseFloat(incomeInputs.longTermGains) || 0
    };
  };

  const calculateTax = (): TaxResults => {
    const ordinaryIncome = calculateOrdinaryIncome();
    const { qualifiedDividends, longTermGains } = calculateQualifiedIncome();
    const qualifiedIncome = qualifiedDividends + longTermGains;
    const totalIncome = ordinaryIncome + qualifiedIncome;

    // Determine deduction amount
    const deduction = isItemized ? (parseFloat(itemizedAmount) || 0) : standardDeductions[filingStatus];

    // Apply deductions proportionally
    const deductionRatio = totalIncome > 0 ? deduction / totalIncome : 0;
    const taxableOrdinaryIncome = Math.max(0, ordinaryIncome * (1 - deductionRatio));
    const taxableQualifiedIncome = Math.max(0, qualifiedIncome * (1 - deductionRatio));
    
    // Calculate ordinary income tax
    let remainingIncome = taxableOrdinaryIncome;
    let totalOrdinaryTax = 0;
    let previousUpTo = 0;

    for (const bracket of taxBrackets[filingStatus]) {
      const bracketAmount = Math.min(remainingIncome, bracket.upTo - previousUpTo);
      if (bracketAmount <= 0) break;
      
      totalOrdinaryTax += bracketAmount * bracket.rate;
      remainingIncome -= bracketAmount;
      previousUpTo = bracket.upTo;
    }

    // Calculate qualified income tax (long-term capital gains and qualified dividends)
    let totalQualifiedTax = 0;
    if (taxableQualifiedIncome > 0) {
      // Start from the bracket that corresponds to total ordinary taxable income
      let totalTaxableIncome = taxableOrdinaryIncome;
      let qualifiedRemaining = taxableQualifiedIncome;
      previousUpTo = 0;

      for (const bracket of longTermGainsBrackets[filingStatus]) {
        // Skip brackets that are completely filled by ordinary income
        if (bracket.upTo <= totalTaxableIncome) {
          previousUpTo = bracket.upTo;
          continue;
        }

        // Calculate how much qualified income fits in this bracket
        const availableInBracket = bracket.upTo - Math.max(totalTaxableIncome, previousUpTo);
        const bracketAmount = Math.min(qualifiedRemaining, availableInBracket);
        
        if (bracketAmount <= 0) break;

        totalQualifiedTax += bracketAmount * bracket.rate;
        qualifiedRemaining -= bracketAmount;
        totalTaxableIncome += bracketAmount;
        previousUpTo = bracket.upTo;
      }
    }

    return {
      ordinaryTax: totalOrdinaryTax,
      qualifiedTax: totalQualifiedTax,
      totalTax: totalOrdinaryTax + totalQualifiedTax,
      taxableOrdinaryIncome,
      taxableQualifiedIncome
    };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalIncome = calculateOrdinaryIncome() + 
    calculateQualifiedIncome().qualifiedDividends + 
    calculateQualifiedIncome().longTermGains;
  const taxResults = calculateTax();
  const taxableIncome = taxResults.taxableOrdinaryIncome + taxResults.taxableQualifiedIncome;
  const effectiveRate = taxableIncome > 0 ? (taxResults.totalTax / taxableIncome * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <Card className="max-w-[800px] mx-auto shadow-lg">
        <CardHeader className="space-y-2 border-b bg-white rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Calculator className="h-6 w-6 text-blue-500" />
            <CardTitle className="text-2xl text-blue-900">Federal Income Tax Calculator (2024)</CardTitle>
          </div>
          <CardDescription className="text-slate-500">
            Calculate your estimated federal income tax based on different types of income
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          {/* Filing Status Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100">
            <Label className="text-lg font-semibold text-blue-900 block mb-4">Filing Status</Label>
            <Select value={filingStatus} onValueChange={(value: FilingStatus) => setFilingStatus(value)}>
              <SelectTrigger className="w-full md:w-1/2">
                <SelectValue placeholder="Select filing status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="joint">Married Filing Jointly</SelectItem>
                <SelectItem value="head">Head of Household</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Income Inputs Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100">
            <div className="space-y-6">
              {/* Ordinary Income Section */}
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-blue-500" />
                  Ordinary Income
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="wages" className="text-sm font-medium text-slate-600">
                      Wages & Salary
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                      <Input
                        id="wages"
                        type="number"
                        className="pl-7"
                        value={incomeInputs.wages}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('wages', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interest" className="text-sm font-medium text-slate-600">
                      Interest Income
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                      <Input
                        id="interest"
                        type="number"
                        className="pl-7"
                        value={incomeInputs.interest}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('interest', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nonQualifiedDividends" className="text-sm font-medium text-slate-600">
                      Non-Qualified Dividends
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                      <Input
                        id="nonQualifiedDividends"
                        type="number"
                        className="pl-7"
                        value={incomeInputs.nonQualifiedDividends}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('nonQualifiedDividends', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortTermGains" className="text-sm font-medium text-slate-600">
                      Short-Term Capital Gains
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                      <Input
                        id="shortTermGains"
                        type="number"
                        className="pl-7"
                        value={incomeInputs.shortTermGains}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('shortTermGains', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Qualified Income Section */}
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-blue-500" />
                  Qualified Income
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="qualifiedDividends" className="text-sm font-medium text-slate-600">
                      Qualified Dividends
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                      <Input
                        id="qualifiedDividends"
                        type="number"
                        className="pl-7"
                        value={incomeInputs.qualifiedDividends}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('qualifiedDividends', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="longTermGains" className="text-sm font-medium text-slate-600">
                      Long-Term Capital Gains
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                      <Input
                        id="longTermGains"
                        type="number"
                        className="pl-7"
                        value={incomeInputs.longTermGains}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('longTermGains', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Income */}
              <div className="space-y-2">
                <Label htmlFor="otherIncome" className="text-sm font-medium text-slate-600">
                  Other Income
                </Label>
                <div className="relative max-w-md">
                  <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                  <Input
                    id="otherIncome"
                    type="number"
                    className="pl-7"
                    value={incomeInputs.otherIncome}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleIncomeChange('otherIncome', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Deductions Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Deductions</h3>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant={!isItemized ? "default" : "outline"}
                  onClick={() => setIsItemized(false)}
                  className={!isItemized ? "bg-blue-500 hover:bg-blue-600" : ""}
                >
                  Standard ({formatCurrency(standardDeductions[filingStatus])})
                </Button>
                <Button 
                  variant={isItemized ? "default" : "outline"}
                  onClick={() => setIsItemized(true)}
                  className={isItemized ? "bg-blue-500 hover:bg-blue-600" : ""}
                >
                  Itemized
                </Button>
              </div>

              {isItemized && (
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="itemized-amount" className="text-sm font-medium text-slate-600">
                    Itemized Deduction Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                    <Input
                      id="itemized-amount"
                      type="number"
                      className="pl-7"
                      value={itemizedAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemizedAmount(e.target.value)}
                      placeholder="Enter itemized deduction amount"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-6 shadow-sm border border-blue-100">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Tax Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Income:</span>
                <span className="font-semibold text-blue-900">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Taxable Income:</span>
                <span className="font-semibold text-blue-900">{formatCurrency(taxableIncome)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Ordinary Income Tax:</span>
                <span className="font-semibold text-blue-900">{formatCurrency(taxResults.ordinaryTax)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Qualified Income Tax:</span>
                <span className="font-semibold text-blue-900">{formatCurrency(taxResults.qualifiedTax)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-blue-200">
                <span className="text-slate-800 font-medium">Total Tax:</span>
                <span className="font-bold text-blue-900 text-lg">{formatCurrency(taxResults.totalTax)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Effective Tax Rate:</span>
                <span className="font-semibold text-blue-900">{effectiveRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
