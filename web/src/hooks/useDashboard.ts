import { useState, useEffect, useCallback } from 'react';
import { rerankerApi, indexApi, configApi, healthApi, keywordsApi } from '../api';

interface RerankerOption {
    id: string;
    backend: string;
    label: string;
    description: string;
}

interface IndexStatusMetadata {
    current_repo: string;
    current_branch: string;
    timestamp: string;
    embedding_model: string;
    keywords_count: number;
    total_storage: number;
    repos: {
        name: string;
        profile: string;
        chunk_count: number;
        has_cards: boolean;
        sizes: {
            chunks?: number;
            bm25?: number;
            cards?: number;
        };
    }[];
}

interface IndexStatus {
    lines: string[];
    metadata: IndexStatusMetadata | null;
    running: boolean;
}


export function useDashboard() {
    const [rerankerOptions, setRerankerOptions] = useState<RerankerOption[]>([]);
    const [isEvalDropdownOpen, setIsEvalDropdownOpen] = useState(false);
    const [branch, setBranch] = useState('—');
    const [repo, setRepo] = useState('—');
    const [health, setHealth] = useState('—');
    const [cards, setCards] = useState('—');
    const [mcp, setMcp] = useState('—');
    const [autotune, setAutotune] = useState('—');
    const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);

    // Terminal State
    const [isTerminalVisible, setIsTerminalVisible] = useState(false);
    const [terminalTitle, setTerminalTitle] = useState('');
    const [terminalLines, setTerminalLines] = useState<string[]>([]);
    const [terminalProgress, setTerminalProgress] = useState<{ percent: number, message: string } | null>(null);

    const showTerminal = useCallback((title: string) => {
        setTerminalTitle(title);
        setIsTerminalVisible(true);
        setTerminalLines([]);
        setTerminalProgress(null);
    }, []);

    const hideTerminal = () => {
        setIsTerminalVisible(false);
    };
    
    const appendTerminalLine = useCallback((line: string) => {
        setTerminalLines(prev => [...prev, line]);
    }, []);

    const toggleEvalDropdown = () => {
        setIsEvalDropdownOpen(prev => !prev);
    };

    const closeEvalDropdown = useCallback(() => {
        setIsEvalDropdownOpen(false);
    }, []);


    // Fetch reranker options
    useEffect(() => {
        const fetchRerankerOptions = async () => {
            try {
                const data = await rerankerApi.getAvailable();
                if (data.options) {
                    setRerankerOptions(data.options);
                }
            } catch (error) {
                console.error('Failed to load reranker options:', error);
            }
        };
        fetchRerankerOptions();
    }, []);

    // Poll for index status
    useEffect(() => {
        const poll = async () => {
            try {
                const data: IndexStatus = await indexApi.getStatus();
                setIndexStatus(data);
                if (data.metadata) {
                    setBranch(data.metadata.current_branch);
                    setRepo(data.metadata.current_repo);
                    const cardsCount = data.metadata.repos.reduce((acc, repo) => acc + (repo.has_cards ? 1 : 0), 0);
                    setCards(`${cardsCount} / ${data.metadata.repos.length}`);
                }
                 const healthData = await healthApi.check();
                 if(healthData.status === 'ok'){
                    setHealth('OK');
                 } else {
                    setHealth('Error');
                 }

                 const configData = await configApi.get();
                 if(configData.MCP_SERVER_URL){
                     setMcp('Active');
                 } else {
                     setMcp('Inactive');
                 }
                 if(configData.AUTOTUNE_ENABLED === 'true'){
                    setAutotune('Enabled')
                 } else {
                    setAutotune('Disabled')
                 }


            } catch (error) {
                console.error('Failed to poll index status:', error);
            }
        };

        poll(); // initial poll
        const intervalId = setInterval(poll, 5000); // poll every 5 seconds

        return () => clearInterval(intervalId);
    }, []);

    const runIndexer = useCallback(async () => {
        showTerminal('Run Indexer');
        try {
            await indexApi.runIndexer(repo, true, appendTerminalLine);
        } catch (error) {
            console.error('Failed to start indexer:', error);
            appendTerminalLine(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [repo, showTerminal, appendTerminalLine]);
    
    const runKeywords = useCallback(async () => {
        showTerminal('Generate Keywords');
        try {
            await keywordsApi.generate(repo, appendTerminalLine);
        } catch (error) {
            console.error('Failed to generate keywords:', error);
            appendTerminalLine(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, [repo, showTerminal, appendTerminalLine]);
    
    const runEval = useCallback(async (model: string, backend: string) => {
        showTerminal(`Evaluate - ${model}`);
        appendTerminalLine(`Running eval with model: ${model}, backend: ${backend}`);
        // Placeholder for eval logic
        console.log(`Running eval with model: ${model}, backend: ${backend}`);
        closeEvalDropdown();
    }, [showTerminal, appendTerminalLine, closeEvalDropdown]);

    // Close dropdown on click outside
    useEffect(() => {
        if (!isEvalDropdownOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const trigger = document.getElementById('dash-eval-trigger');
            const dropdown = document.getElementById('dash-eval-dropdown');
            if (trigger && dropdown && !trigger.contains(event.target as Node) && !dropdown.contains(event.target as Node)) {
                closeEvalDropdown();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [isEvalDropdownOpen, closeEvalDropdown]);

    return {
        rerankerOptions,
        isEvalDropdownOpen,
        toggleEvalDropdown,
        runEval,
        branch,
        repo,
        health,
        cards,
        mcp,
        autotune,
        runIndexer,
        runKeywords,
        indexStatus,
        isTerminalVisible,
        terminalTitle,
        terminalLines,
        terminalProgress,
        hideTerminal,
    };
}