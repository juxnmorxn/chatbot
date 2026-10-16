const sample = `
     PON    ONU SERIAL        ONLINE    ACTIVE    RX       TX       RX.OLT   VCC       BIAS   TEMP   
NO.  ID     ID  NUMBER        STATUS    STATUS    (dBm)    (dBm)    (dBm)    (mV)      (mA)   (C)    
------------------------------------------------------------------------------------------------------
1    1/0/1  0   HWTC-6841F9B6 online    active    -23.87   2.32     -25.53   3340.00   13.00  49.00   
2    1/0/1  1   HWTC-685E10B6 online    active    -19.83   1.95     -22.68   3380.00   9.00   42.00   
3    1/0/1  2   HWTC-685311B6 online    active    -24.69   2.37     -23.87   3360.00   9.00   34.00   
4    1/0/1  3   HWTC-68469FB6 online    active    -24.20   2.25     -24.20   3400.00   9.00   46.00   
5    1/0/1  4   HWTC-C193E4B7 offline   inactive  -        -        -        -         -      -       
`;

for (const line of sample.split('\n')) {
  const match = line.match(/^\s*\d+\s+([\d/]+)\s+(\d+)\s+([A-Za-z0-9_-]+)\s+(\w+)\s+\w+\s+([\d.-]+|-)\s+([\d.-]+|-)/);
  if (match) console.log('MATCH:', match[2], match[3], match[4], match[5], match[6]);
}
