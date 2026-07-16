import React from 'react'
import { Box, Text, Button } from '@chakra-ui/react'
import {executeCode} from '../api.js'
import { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify';

const Output = ({editorRef, language}) => {
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setError] = useState(false);

  const runCode = async() => {
    const sourceCode = editorRef.current.getValue();
    
    if(!sourceCode) {
      alert("Please enter some code to execute.");
      return;
    }
    try {
      setIsLoading(true);
      const result = await executeCode(language, sourceCode);
      setOutput(result.run.output.split("\n"));
      result.stderr ? setError(true) : setError(false);
    }catch(err) { 
      toast.error(err.message, {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      progress: undefined,
      theme: "dark",
      transition: Bounce,
      });
    }finally{
      setIsLoading(false);
    }
  }

  return (
    <Box w={"50%"}>
      <Text mb={2} fontSize="lg">
        Output
      </Text>
      <Button variant="outline" colorScheme="green" mb={4}
        onClick={runCode} isLoading={isLoading}> 
        Run Code
      </Button>
      <Box
        height="75vh"
        p={2}
        border="1px solid"
        color = {isError ? "red.500" : ""}
        borderRadius={4}
        borderColor= {isError ? "red.500" : "gray.200"}
      >
        {
          output ? (output.map((line, index) => <Text key={index}>{line}</Text>)) : "Click Run to execute the code."
        }
      </Box>
    </Box>
  );
}

export default Output
